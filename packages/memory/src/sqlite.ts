import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { keywordTokens } from "./embedding.js";
import type { MemoryStoreOptions, StoredMemoryRow } from "./types.js";

type RankedRow = StoredMemoryRow & { score: number };

export class SqliteMemoryDb {
  readonly vectorAvailable: boolean;
  private readonly db: DatabaseSync;

  constructor(options: MemoryStoreOptions = {}) {
    const dbPath = options.dbPath ?? ":memory:";
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        essence TEXT,
        details TEXT,
        tags TEXT,
        trigger_conditions TEXT,
        importance REAL DEFAULT 0.5,
        strength REAL DEFAULT 1.0,
        decay_tau INTEGER DEFAULT 86400000,
        last_accessed_at TEXT,
        access_count INTEGER DEFAULT 0,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        search_text TEXT NOT NULL,
        embedding TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
    `);
    this.ensureColumn('"key" TEXT');
    try {
      this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_key_unique ON memories("key")');
    } catch {
      // ignore constraint migration races
    }
    this.ensureColumn("essence TEXT");
    this.ensureColumn("details TEXT");
    this.ensureColumn("tags TEXT");
    this.ensureColumn("trigger_conditions TEXT");
    this.ensureColumn("importance REAL DEFAULT 0.5");
    this.ensureColumn("strength REAL DEFAULT 1.0");
    this.ensureColumn("decay_tau INTEGER DEFAULT 86400000");
    this.ensureColumn("last_accessed_at TEXT");
    this.ensureColumn("access_count INTEGER DEFAULT 0");
    this.ensureColumn("updated_at TEXT");
    this.vectorAvailable =
      options.enableVectorSearch === false
        ? false
        : tryLoadVectorExtension(this.db, options.vectorExtensionPath);
    try {
    try {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_memories_key ON memories("key")');
    } catch {
      // ignore migration races and older SQLite versions
    }
    } catch {
      // ignore migration races and older SQLite versions
    }
    this.backfillMissingKeys();
  }

  insert(row: StoredMemoryRow): void {
    this.db
      .prepare(
        `INSERT INTO memories
         (id, text, essence, details, tags, trigger_conditions, importance, strength, decay_tau, last_accessed_at, access_count, metadata, created_at, updated_at, "key", search_text, embedding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.text,
        row.essence,
        row.details,
        row.tags,
        row.trigger_conditions,
        row.importance,
        row.strength,
        row.decay_tau,
        row.last_accessed_at,
        row.access_count,
        row.metadata,
        row.created_at,
        row.updated_at,
        row.key,
        row.search_text,
        row.embedding,
      );
  }

  upsertByKey(row: StoredMemoryRow): void {
    this.db
      .prepare(
        `INSERT INTO memories
         (id, text, essence, details, tags, trigger_conditions, importance, strength, decay_tau, last_accessed_at, access_count, metadata, created_at, updated_at, "key", search_text, embedding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT("key") DO UPDATE SET
           text = excluded.text,
           essence = excluded.essence,
           details = excluded.details,
           tags = excluded.tags,
           trigger_conditions = excluded.trigger_conditions,
           importance = excluded.importance,
           strength = excluded.strength,
           decay_tau = excluded.decay_tau,
           last_accessed_at = excluded.last_accessed_at,
           access_count = excluded.access_count,
           metadata = excluded.metadata,
           updated_at = excluded.updated_at,
           search_text = excluded.search_text,
           embedding = excluded.embedding`,
      )
      .run(
        row.id,
        row.text,
        row.essence,
        row.details,
        row.tags,
        row.trigger_conditions,
        row.importance,
        row.strength,
        row.decay_tau,
        row.last_accessed_at,
        row.access_count,
        row.metadata,
        row.created_at,
        row.updated_at,
        row.key,
        row.search_text,
        row.embedding,
      );
  }

  getByKey(key: string): StoredMemoryRow | undefined {
    return this.db
      .prepare(
        `SELECT
           id, text, essence, details, tags, trigger_conditions, importance, strength, decay_tau, last_accessed_at, access_count, metadata, created_at, updated_at, search_text, embedding, "key"
         FROM memories
         WHERE "key" = ?`,
      )
      .get<StoredMemoryRow>(key);
  }

  deleteByKey(key: string): boolean {
    const result = this.db.prepare('DELETE FROM memories WHERE "key" = ?').run(key);
    return Number(result.changes) > 0;
  }

  listAll(): StoredMemoryRow[] {
    return this.db
      .prepare(
        `SELECT id, text, essence, details, tags, trigger_conditions, importance, strength, decay_tau, last_accessed_at, access_count, metadata, created_at, updated_at, search_text, embedding, "key"
         FROM memories
         ORDER BY created_at DESC, id DESC`,
      )
      .all<StoredMemoryRow>();
  }

  list(limit: number): StoredMemoryRow[] {
    return this.db
      .prepare(
        `SELECT id, text, essence, details, tags, trigger_conditions, importance, strength, decay_tau, last_accessed_at, access_count, metadata, created_at, updated_at, search_text, embedding, "key"
         FROM memories
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .all<StoredMemoryRow>(limit);
  }

  listWithEmbeddings(): StoredMemoryRow[] {
    return this.db
      .prepare(
        `SELECT id, text, essence, details, tags, trigger_conditions, importance, strength, decay_tau, last_accessed_at, access_count, metadata, created_at, updated_at, search_text, embedding, "key"
         FROM memories
         WHERE embedding IS NOT NULL`,
      )
      .all<StoredMemoryRow>();
  }

  searchByKeywords(query: string, topK: number): StoredMemoryRow[] {
    const tokens = keywordTokens(query);
    if (tokens.length === 0) {
      return this.list(topK);
    }
    const predicates = tokens.map(() => "search_text LIKE ?").join(" OR ");
    const params = tokens.map((token) => `%${token}%`);
    const rows = this.db
      .prepare(
        `SELECT id, text, essence, details, tags, trigger_conditions, importance, strength, decay_tau, last_accessed_at, access_count, metadata, created_at, updated_at, search_text, embedding, "key"
         FROM memories
         WHERE ${predicates}
         ORDER BY created_at DESC`,
      )
      .all<StoredMemoryRow>(...params);
    return rows
      .map((row) => ({ ...row, score: scoreKeywordMatch(row.search_text, tokens) }))
      .sort(compareRankedRows)
      .slice(0, topK);
  }

  clear(): void {
    this.db.prepare("DELETE FROM memories").run();
  }

  close(): void {
    this.db.close();
  }

  private ensureColumn(definition: string): void {
    try {
      this.db.exec(`ALTER TABLE memories ADD COLUMN ${definition}`);
    } catch {
      // Column already exists in upgraded schema; ignore.
    }
  }

  private backfillMissingKeys(): void {
    try {
      this.db.exec('UPDATE memories SET "key" = id WHERE "key" IS NULL');
    } catch {
      // ignore for older schema during initial migrations
    }
  }
}

function tryLoadVectorExtension(db: DatabaseSync, extensionPath?: string): boolean {
  if (!extensionPath) {
    return false;
  }
  try {
    db.enableLoadExtension(true);
    db.loadExtension(extensionPath);
    return true;
  } catch {
    return false;
  } finally {
    db.enableLoadExtension(false);
  }
}

function scoreKeywordMatch(searchText: string, tokens: string[]): number {
  return tokens.reduce((score, token) => score + Number(searchText.includes(token)), 0);
}

function compareRankedRows(left: RankedRow, right: RankedRow): number {
  return right.score - left.score || right.created_at.localeCompare(left.created_at);
}
