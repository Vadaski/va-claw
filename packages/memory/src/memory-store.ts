import { randomUUID } from "node:crypto";
import { buildSearchText, cosineSimilarity, createEmbedding } from "./embedding.js";
import { SqliteMemoryDb } from "./sqlite.js";
import type { MemoryEntry, MemoryMetadata, MemoryStoreOptions, StoredMemoryRow } from "./types.js";

export class MemoryStore {
  private readonly db: SqliteMemoryDb;

  constructor(options: MemoryStoreOptions = {}) {
    this.db = new SqliteMemoryDb(options);
  }

  async store(text: string, metadata: MemoryMetadata = null): Promise<string> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const searchText = buildSearchText(text, metadata);
    const embedding = this.db.vectorAvailable ? JSON.stringify(createEmbedding(searchText)) : null;
    this.db.insert({
      id,
      text,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: createdAt,
      search_text: searchText,
      embedding,
    });
    return id;
  }

  async search(query: string, topK = 5): Promise<MemoryEntry[]> {
    const safeTopK = Math.max(1, topK);
    if (this.db.vectorAvailable) {
      const queryEmbedding = createEmbedding(query);
      return this.db
        .listWithEmbeddings()
        .map((row) => ({ row, score: cosineSimilarity(queryEmbedding, parseEmbedding(row.embedding)) }))
        .sort((left, right) => right.score - left.score || compareRows(left.row, right.row))
        .slice(0, safeTopK)
        .map(({ row }) => toMemoryEntry(row));
    }
    return this.db.searchByKeywords(query, safeTopK).map((row) => toMemoryEntry(row));
  }

  async list(limit = 50): Promise<MemoryEntry[]> {
    return this.db.list(Math.max(1, limit)).map((row) => toMemoryEntry(row));
  }

  async clear(): Promise<void> {
    this.db.clear();
  }

  close(): void {
    this.db.close();
  }
}

function parseEmbedding(embedding: string | null): number[] {
  if (!embedding) {
    return [];
  }
  const value = JSON.parse(embedding) as unknown;
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function toMemoryEntry(row: StoredMemoryRow): MemoryEntry {
  return {
    id: row.id,
    text: row.text,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

function parseMetadata(metadata: string | null): MemoryMetadata {
  if (!metadata) {
    return null;
  }
  const value = JSON.parse(metadata) as unknown;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function compareRows(left: StoredMemoryRow, right: StoredMemoryRow): number {
  return right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id);
}
