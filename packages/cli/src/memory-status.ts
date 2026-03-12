import { DatabaseSync } from "node:sqlite";

export async function countMemoryEntries(
  memoryDbPath: string,
  fileExists: (path: string) => Promise<boolean>,
): Promise<number> {
  if (!(await fileExists(memoryDbPath))) {
    return 0;
  }
  const db = new DatabaseSync(memoryDbPath);
  try {
    const row = db.prepare("SELECT COUNT(*) AS count FROM memories").get<{ count: number }>();
    return Number(row?.count ?? 0);
  } finally {
    db.close();
  }
}

export async function findLastWakeAt(
  memoryDbPath: string,
  fileExists: (path: string) => Promise<boolean>,
): Promise<string | null> {
  if (!(await fileExists(memoryDbPath))) {
    return null;
  }
  const db = new DatabaseSync(memoryDbPath);
  try {
    const rows = db
      .prepare("SELECT metadata, created_at FROM memories ORDER BY created_at DESC LIMIT 100")
      .all<{ metadata: string | null; created_at: string }>();
    for (const row of rows) {
      const metadata = parseMetadata(row.metadata);
      if (metadata?.source === "va-claw-daemon" || metadata?.kind === "wake") {
        return typeof metadata.wokeAt === "string" ? metadata.wokeAt : row.created_at;
      }
    }
    return null;
  } finally {
    db.close();
  }
}

function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  const value = JSON.parse(raw) as unknown;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
