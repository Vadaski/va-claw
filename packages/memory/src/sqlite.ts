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
        metadata TEXT,
        created_at TEXT NOT NULL,
        search_text TEXT NOT NULL,
        embedding TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
    `);
    this.vectorAvailable =
      options.enableVectorSearch === false
        ? false
        : tryLoadVectorExtension(this.db, options.vectorExtensionPath);
  }

  insert(row: StoredMemoryRow): void {
    this.db
      .prepare(
        `INSERT INTO memories (id, text, metadata, created_at, search_text, embedding)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(row.id, row.text, row.metadata, row.created_at, row.search_text, row.embedding);
  }

  list(limit: number): StoredMemoryRow[] {
    return this.db
      .prepare(
        `SELECT id, text, metadata, created_at, search_text, embedding
         FROM memories
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .all<StoredMemoryRow>(limit);
  }

  listWithEmbeddings(): StoredMemoryRow[] {
    return this.db
      .prepare(
        `SELECT id, text, metadata, created_at, search_text, embedding
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
        `SELECT id, text, metadata, created_at, search_text, embedding
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
