import { randomUUID } from "node:crypto";
import { buildSearchText, cosineSimilarity, createEmbedding, keywordTokens } from "./embedding.js";
import { computeRetention, reinforceOnAccess } from "./forgetting-curve.js";
import { SqliteMemoryDb } from "./sqlite.js";
import type { MemoryEntry, MemoryMetadata, MemoryStoreOptions, StoredMemoryRow } from "./types.js";

const DAY_IN_MS = 86_400_000;
const ONE_WEEK_IN_MS = 7 * DAY_IN_MS;
const DEFAULT_IMPORTANCE = 0.5;
const DEFAULT_STRENGTH = 1.0;
const DEFAULT_DECAY_TAU = DAY_IN_MS;

const KEYWORD_WEIGHTS = {
  tag: 1.0,
  trigger: 0.9,
  essence: 0.8,
  details: 0.4,
} as const;

type ConsolidateSummary = {
  forgotten: number;
  strengthened: number;
  total: number;
  potentialDuplicates: [string, string][];
};

type MemorizeOptions = {
  tags?: string[];
  details?: string;
  triggerConditions?: string[];
  importance?: number;
};

type UpdateOptions = {
  essence?: string;
  details?: string;
  tags?: string[];
  triggerConditions?: string[];
  importance?: number;
};

type RecallCandidate = {
  entry: MemoryEntry;
  keywordScore: number;
  retention: number;
  finalScore: number;
};

export class MemoryStore {
  private readonly db: SqliteMemoryDb;
  private readonly embeddingEnabled: boolean;

  constructor(options: MemoryStoreOptions = {}) {
    this.db = new SqliteMemoryDb(options);
    this.embeddingEnabled = this.db.vectorAvailable;
  }

  async memorize(
    key: string,
    essence: string,
    options: MemorizeOptions = {},
  ): Promise<MemoryEntry> {
    const existing = this.db.getByKey(key);
    const now = nowString();
    const existingEntry = existing ? toMemoryEntry(existing) : undefined;
    const normalizedImportance = clamp01(options.importance ?? existingEntry?.importance ?? DEFAULT_IMPORTANCE);
    const tags = normalizeStringArray(
      options.tags ??
        existingEntry?.tags ?? [],
    );
    const triggerConditions = normalizeStringArray(
      options.triggerConditions ??
        existingEntry?.triggerConditions ?? [],
    );
    const details =
      options.details === undefined ? existingEntry?.details : options.details;

    const searchText = buildSearchTextFromParts(essence, {
      details,
      tags,
      triggerConditions,
      metadata: existingEntry?.metadata,
    });

    const row: StoredMemoryRow = {
      id: existingEntry?.id ?? randomUUID(),
      text: essence,
      essence,
      details: details ?? null,
      metadata: existingEntry?.metadata ? JSON.stringify(existingEntry.metadata) : null,
      created_at: existingEntry?.createdAt ?? now,
      search_text: searchText,
      embedding: await this.createStoredEmbedding(searchText),
      key,
      tags: JSON.stringify(tags),
      trigger_conditions: JSON.stringify(triggerConditions),
      importance: normalizedImportance,
      strength: existingEntry?.strength ?? DEFAULT_STRENGTH,
      decay_tau: existingEntry?.decayTau ?? DEFAULT_DECAY_TAU,
      last_accessed_at: existingEntry?.lastAccessedAt ?? now,
      access_count: existingEntry?.accessCount ?? 0,
      updated_at: now,
    };
    this.db.upsertByKey(row);
    return toMemoryEntry(this.db.getByKey(key) ?? row);
  }

  async get(key: string): Promise<MemoryEntry | undefined> {
    const row = this.db.getByKey(key);
    return row ? toMemoryEntry(row) : undefined;
  }

  async update(key: string, changes: UpdateOptions): Promise<MemoryEntry | undefined> {
    const row = this.db.getByKey(key);
    if (!row) {
      return undefined;
    }
    const entry = toMemoryEntry(row);
    const nextEssence = changes.essence ?? entry.essence;
    const nextDetails = changes.details === undefined ? entry.details : changes.details;
    const nextTags = changes.tags ?? entry.tags;
    const nextTriggerConditions = changes.triggerConditions ?? entry.triggerConditions;
    const nextImportance = clamp01(changes.importance ?? entry.importance);
    const searchText = buildSearchTextFromParts(nextEssence, {
      details: nextDetails,
      tags: nextTags,
      triggerConditions: nextTriggerConditions,
      metadata: entry.metadata,
    });
    const updated: StoredMemoryRow = {
      ...row,
      text: nextEssence,
      essence: nextEssence,
      details: nextDetails ?? null,
      tags: JSON.stringify(normalizeStringArray(nextTags)),
      trigger_conditions: JSON.stringify(normalizeStringArray(nextTriggerConditions)),
      importance: nextImportance,
      search_text: searchText,
      embedding: await this.createStoredEmbedding(
        searchText,
        searchText === row.search_text ? row.embedding : null,
      ),
      updated_at: nowString(),
    };
    this.db.upsertByKey(updated);
    return toMemoryEntry(updated);
  }

  async forget(key: string): Promise<boolean> {
    return this.db.deleteByKey(key);
  }

  async recall(query: string, limit = 5): Promise<MemoryEntry[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 5;
    const tokens = keywordTokens(query);
    const queryEmbedding = await this.loadQueryEmbedding(query);
    if (tokens.length === 0 && !queryEmbedding) {
      return [];
    }
    const now = nowString();
    const scoredRows = this.db.listAll().map((row) => {
      const entry = toMemoryEntry(row);
      const keywordScore = computeKeywordScore(entry, tokens);
      const embeddingScore =
        queryEmbedding && row.embedding ? cosineSimilarity(queryEmbedding, parseEmbedding(row.embedding)) : 0;
      const relevanceScore = keywordScore > 0 ? keywordScore : embeddingScore;
      if (relevanceScore <= 0) {
        return undefined;
      }
      const retention = computeRetention(
        entry.strength,
        entry.lastAccessedAt ?? entry.updatedAt,
        entry.decayTau,
        entry.importance,
        entry.accessCount,
      );
      return {
        entry,
        keywordScore,
        retention,
        finalScore: relevanceScore * 0.7 + retention * 0.3,
      };
    });
    const scored = scoredRows
      .filter((candidate): candidate is RecallCandidate => candidate !== undefined)
      .sort((left, right) => right.finalScore - left.finalScore || right.retention - left.retention);

    const results: MemoryEntry[] = [];
    for (const selected of scored.slice(0, safeLimit)) {
      const strengthenedStrength = reinforceOnAccess(selected.entry.strength, selected.entry.importance);
      const strengthenedCount = selected.entry.accessCount + 1;
      const row = this.db.getByKey(selected.entry.key);
      if (row) {
        this.db.upsertByKey({
          ...row,
          strength: strengthenedStrength,
          access_count: strengthenedCount,
          last_accessed_at: now,
          updated_at: now,
        });
        results.push({
          ...selected.entry,
          strength: strengthenedStrength,
          accessCount: strengthenedCount,
          lastAccessedAt: now,
          updatedAt: now,
        });
      } else {
        results.push({
          ...selected.entry,
          strength: strengthenedStrength,
          accessCount: strengthenedCount,
          lastAccessedAt: now,
          updatedAt: now,
        });
      }
    }
    return results;
  }

  async consolidate(): Promise<ConsolidateSummary> {
    const now = Date.now();
    const nowIso = toISOString(now);
    const weekAgo = now - ONE_WEEK_IN_MS;
    const rows = this.db.listAll();
    const entries = rows.map((row) => toMemoryEntry(row));
    const potentialDuplicates: [string, string][] = [];
    for (let index = 0; index < entries.length; index += 1) {
      for (let inner = index + 1; inner < entries.length; inner += 1) {
        const left = entries[index];
        const right = entries[inner];
        if (computeEssenceSimilarity(left.essence, right.essence) > 0.8) {
          potentialDuplicates.push([left.key, right.key]);
        }
      }
    }

    let forgotten = 0;
    let strengthened = 0;
    const survivors: MemoryEntry[] = [];

    for (const row of rows) {
      const entry = toMemoryEntry(row);
      const retention = computeRetention(
        entry.strength,
        entry.lastAccessedAt ?? entry.updatedAt,
        entry.decayTau,
        entry.importance,
        entry.accessCount,
      );
      if (retention < 0.1) {
        if (this.db.deleteByKey(entry.key)) {
          forgotten += 1;
        }
        continue;
      }

      const accessedRecently =
        entry.lastAccessedAt ? Date.parse(entry.lastAccessedAt) >= weekAgo : false;
      if (accessedRecently) {
        const nextStrength = reinforceOnAccess(entry.strength, entry.importance);
        const nextCount = entry.accessCount + 1;
        const searchText = buildSearchTextFromParts(entry.essence, {
          details: entry.details,
          tags: entry.tags,
          triggerConditions: entry.triggerConditions,
          metadata: entry.metadata,
        });
        const updated: StoredMemoryRow = {
          ...row,
          strength: nextStrength,
          access_count: nextCount,
          last_accessed_at: nowIso,
          updated_at: nowIso,
          search_text: searchText,
          embedding: await this.createStoredEmbedding(searchText, row.embedding),
        };
        this.db.upsertByKey(updated);
        survivors.push(toMemoryEntry(updated));
        strengthened += 1;
      } else {
        survivors.push(entry);
      }
    }

    return {
      forgotten,
      strengthened,
      total: this.db.listAll().length,
      potentialDuplicates,
    };
  }

  async reflect(): Promise<string> {
    const rows = this.db.listAll();
    if (rows.length === 0) {
      return "## No memories yet.";
    }
    const groups = new Map<string, MemoryEntry[]>();
    for (const entry of rows.map(toMemoryEntry)) {
      const tag = entry.tags[0] ?? "untagged";
      const bucket = groups.get(tag) ?? [];
      bucket.push(entry);
      groups.set(tag, bucket);
    }

    const lines: string[] = [];
    for (const [tag, memories] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      lines.push(`## ${tag}`);
      for (const memory of memories) {
        lines.push(`- **${memory.key}**: ${memory.essence}`);
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  async count(): Promise<number> {
    return this.db.listAll().length;
  }

  async search(query: string, topK = 5): Promise<MemoryEntry[]> {
    const safeTopK = Number.isFinite(topK) ? Math.max(0, Math.floor(topK)) : 5;
    if (safeTopK <= 0) {
      return [];
    }
    if (query.trim().length === 0) {
      return this.db.searchByKeywords(query, safeTopK).map((row) => toMemoryEntry(row));
    }

    const queryEmbedding = await this.loadQueryEmbedding(query);
    if (queryEmbedding) {
      const tokens = keywordTokens(query);
      return this.db
        .listAll()
        .map((row) => {
          const score = row.embedding
            ? cosineSimilarity(queryEmbedding, parseEmbedding(row.embedding))
            : computeKeywordScore(toMemoryEntry(row), tokens);
          return { row, score };
        })
        .filter(({ score }) => score > 0)
        .sort((left, right) => right.score - left.score || compareRows(left.row, right.row))
        .slice(0, safeTopK)
        .map(({ row }) => toMemoryEntry(row));
    }
    return this.db.searchByKeywords(query, safeTopK).map((row) => toMemoryEntry(row));
  }

  async list(limit = 50): Promise<MemoryEntry[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 50;
    if (safeLimit === 0) {
      return [];
    }
    return this.db.list(safeLimit).map((row) => toMemoryEntry(row));
  }

  async store(text: string, metadata: MemoryMetadata = null): Promise<string> {
    const key = randomUUID();
    const entry = await this.memorize(key, text, { tags: ["auto"] });
    const row = this.db.getByKey(key);
    if (row) {
      const serializedMetadata = metadata ? JSON.stringify(metadata) : null;
      if (row.metadata !== serializedMetadata) {
        const searchText = buildSearchTextFromParts(entry.essence, {
          details: entry.details,
          tags: entry.tags,
          triggerConditions: entry.triggerConditions,
          metadata,
        });
        this.db.upsertByKey({
          ...row,
          metadata: serializedMetadata,
          search_text: searchText,
          embedding: await this.createStoredEmbedding(searchText, row.embedding),
        });
      }
    }
    return entry.id;
  }

  async clear(): Promise<void> {
    this.db.clear();
  }

  close(): void {
    this.db.close();
  }

  private async createStoredEmbedding(
    searchText: string,
    fallback: string | null = null,
  ): Promise<string | null> {
    if (!this.embeddingEnabled) {
      return null;
    }
    return createStoredEmbedding(searchText, fallback);
  }

  private async loadQueryEmbedding(query: string): Promise<number[] | null> {
    if (!this.embeddingEnabled) {
      return null;
    }
    return loadQueryEmbedding(query);
  }
}

function buildSearchTextFromParts(
  essence: string,
  context: {
    details?: string;
    tags: string[];
    triggerConditions: string[];
    metadata?: MemoryMetadata;
  },
): string {
  const searchMetadata: MemoryMetadata = {
    tags: context.tags,
    triggerConditions: context.triggerConditions,
    details: context.details,
    ...(context.metadata ?? {}),
  };
  return buildSearchText(essence, searchMetadata);
}

function computeEssenceSimilarity(left: string, right: string): number {
  const leftTokens = new Set(keywordTokens(left));
  const rightTokens = new Set(keywordTokens(right));
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / union.size;
}

function computeKeywordScore(entry: MemoryEntry, tokens: string[]): number {
  const normalizedTokens = new Set(tokens);
  return Number(matchTokens(entry.tags, normalizedTokens)) * KEYWORD_WEIGHTS.tag +
    Number(matchText(entry.triggerConditions, normalizedTokens)) * KEYWORD_WEIGHTS.trigger +
    Number(matchText([entry.essence], normalizedTokens)) * KEYWORD_WEIGHTS.essence +
    Number(matchText(entry.details ? [entry.details] : [], normalizedTokens)) * KEYWORD_WEIGHTS.details;
}

function compareRows(left: StoredMemoryRow, right: StoredMemoryRow): number {
  return (
    right.updated_at.localeCompare(left.updated_at) ||
    right.created_at.localeCompare(left.created_at) ||
    right.id.localeCompare(left.id)
  );
}

function parseEmbedding(embedding: string | null): number[] {
  if (!embedding) {
    return [];
  }
  const value = JSON.parse(embedding) as unknown;
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

async function createStoredEmbedding(searchText: string, fallback: string | null = null): Promise<string | null> {
  try {
    return JSON.stringify(await createEmbedding(searchText));
  } catch {
    return fallback;
  }
}

async function loadQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    return await createEmbedding(query);
  } catch {
    return null;
  }
}

function parseMetadata(metadata: string | null): MemoryMetadata {
  if (!metadata) {
    return null;
  }
  const value = JSON.parse(metadata) as unknown;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  const value = JSON.parse(raw) as unknown;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => (typeof item === "string" ? [item.trim()] : [])).filter(Boolean);
}

function matchText(values: string[], tokens: Set<string>): boolean {
  return values
    .flatMap((value) => keywordTokens(value))
    .some((token) => tokens.has(token));
}

function matchTokens(values: string[], tokens: Set<string>): boolean {
  const normalizedValues = values.map((value) => value.toLowerCase());
  return normalizedValues.some((value) => {
    if (tokens.has(value)) {
      return true;
    }
    return [...tokens].some((token) => value.includes(token));
  });
}

function normalizeStringArray(values: string[]): string[] {
  return values
    .map((value) => value.toLowerCase().trim())
    .filter((value, index, array) => value.length > 0 && !array.slice(0, index).includes(value));
}

function toMemoryEntry(row: StoredMemoryRow): MemoryEntry {
  const tags = normalizeStringArray(parseStringArray(row.tags));
  const triggerConditions = normalizeStringArray(parseStringArray(row.trigger_conditions));
  const essence = row.essence || row.text;
  return {
    id: row.id,
    key: row.key ?? row.id,
    essence,
    text: essence,
    details: row.details ?? undefined,
    tags,
    triggerConditions,
    importance: clamp01(row.importance),
    strength: clamp01(row.strength),
    decayTau: clampPositiveNumber(row.decay_tau, DEFAULT_DECAY_TAU),
    lastAccessedAt: row.last_accessed_at ?? undefined,
    accessCount: Math.max(0, Number.isFinite(row.access_count) ? row.access_count : 0),
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function clampPositiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function nowString(): string {
  return new Date().toISOString();
}

function toISOString(time: number): string {
  return new Date(time).toISOString();
}
