import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryStore } from "./memory-store.js";
import { __setEmbeddingExtractorForTests } from "./embedding.js";
import { computeRetention, reinforceOnAccess } from "./forgetting-curve.js";

__setEmbeddingExtractorForTests(async (input) => ({
  data: createTestEmbedding(input),
}));

test("store then list returns the stored id", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const id = await store.store("remember this", { source: "test" });
  const entries = await store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, id);
  assert.equal(entries[0]?.text, "remember this");
  assert.deepEqual(entries[0]?.tags, ["auto"]);
  assert.equal(JSON.stringify(entries[0]?.metadata), JSON.stringify({ source: "test" }));
  store.close();
});

test("search ranks the relevant launch memory first", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.store("alpha project notes");
  await store.store("beta launch checklist");
  const entries = await store.search("launch", 5);
  assert.equal(entries.length >= 1, true);
  assert.equal(entries[0]?.text.includes("launch"), true);
  store.close();
});

test("search still finds legacy rows without embeddings after upgrade", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.memorize("legacy-launch", "launch retrospective from the old system");
  await store.store("completely unrelated note");

  const db = store as unknown as {
    db: {
      getByKey: (key: string) => {
        id: string;
        text: string;
        essence: string;
        details: string | null;
        tags: string | null;
        trigger_conditions: string | null;
        importance: number;
        strength: number;
        decay_tau: number;
        last_accessed_at: string | null;
        access_count: number;
        metadata: string | null;
        created_at: string;
        updated_at: string;
        search_text: string;
        embedding: string | null;
        key: string;
      };
      upsertByKey: (row: {
        id: string;
        text: string;
        essence: string;
        details: string | null;
        tags: string | null;
        trigger_conditions: string | null;
        importance: number;
        strength: number;
        decay_tau: number;
        last_accessed_at: string | null;
        access_count: number;
        metadata: string | null;
        created_at: string;
        updated_at: string;
        search_text: string;
        embedding: string | null;
        key: string;
      }) => void;
    };
  };

  const legacyRow = db.db.getByKey("legacy-launch");
  assert.ok(legacyRow);
  db.db.upsertByKey({
    ...legacyRow,
    embedding: null,
  });

  const entries = await store.search("launch", 5);
  assert.equal(entries.some((entry) => entry.key === "legacy-launch"), true);
  store.close();
});

test("clear removes all entries", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.store("temporary memory");
  await store.clear();
  const entries = await store.list();
  assert.equal(entries.length, 0);
  store.close();
});

test("memorize stores and gets by key", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const entry = await store.memorize("m1", "hello world", {
    tags: ["work", "daily"],
    details: "first entry",
    triggerConditions: ["boot"],
    importance: 0.8,
  });
  assert.equal(entry.key, "m1");
  const fetched = await store.get("m1");
  assert.equal(fetched?.key, "m1");
  assert.equal(fetched?.essence, "hello world");
  assert.equal(fetched?.details, "first entry");
  assert.equal(fetched?.importance, 0.8);
  assert.deepEqual(fetched?.tags, ["work", "daily"]);
  assert.deepEqual(fetched?.triggerConditions, ["boot"]);
  store.close();
});

test("memorize upsert updates existing key", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const first = await store.memorize("m2", "old essence", { tags: ["a"], importance: 0.4 });
  const updated = await store.memorize("m2", "new essence", { tags: ["b"] });
  assert.equal(updated.key, "m2");
  assert.equal(updated.essence, "new essence");
  assert.equal(updated.text, "new essence");
  assert.equal(updated.id, first.id);
  const all = await store.get("m2");
  assert.equal(all?.essence, "new essence");
  assert.deepEqual(all?.tags, ["b"]);
  store.close();
});

test("update can edit existing entry", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.memorize("m3", "before", { tags: ["a"] });
  const updated = await store.update("m3", {
    essence: "after",
    details: "details",
    tags: ["x", "y"],
    importance: 0.9,
  });
  assert.equal(updated?.essence, "after");
  assert.equal(updated?.details, "details");
  assert.deepEqual(updated?.tags, ["x", "y"]);
  assert.equal(updated?.importance, 0.9);
  store.close();
});

test("forget removes memory by key", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.memorize("m4", "to forget", { tags: ["temp"] });
  const removed = await store.forget("m4");
  assert.equal(removed, true);
  const missing = await store.get("m4");
  assert.equal(missing, undefined);
  store.close();
});

test("recall returns matches and updates access count and strength", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.memorize("m5", "build dashboard", { tags: ["project"], details: "frontend work", importance: 0.8 });
  await store.memorize("m6", "random note", { tags: ["random"], details: "not relevant" });

  const db = store as unknown as {
    db: {
      getByKey: (key: string) => {
        id: string;
        text: string;
        essence: string;
        details: string | null;
        tags: string | null;
        trigger_conditions: string | null;
        importance: number;
        strength: number;
        decay_tau: number;
        last_accessed_at: string | null;
        access_count: number;
        metadata: string | null;
        created_at: string;
        updated_at: string;
        search_text: string;
        embedding: string | null;
        key: string;
      };
      upsertByKey: (row: {
        id: string;
        text: string;
        essence: string;
        details: string | null;
        tags: string | null;
        trigger_conditions: string | null;
        importance: number;
        strength: number;
        decay_tau: number;
        last_accessed_at: string | null;
        access_count: number;
        metadata: string | null;
        created_at: string;
        updated_at: string;
        search_text: string;
        embedding: string | null;
        key: string;
      }) => void;
    };
  };
  const row = db.db.getByKey("m5");
  assert.ok(row);
  const seeded = { ...row, strength: 0.3, access_count: 0 };
  db.db.upsertByKey(seeded);

  const entries = await store.recall("project", 5);
  assert.equal(entries.length >= 1, true);
  assert.equal(entries[0]?.key, "m5");
  const loaded = await store.get("m5");
  assert.ok(loaded);
  assert.equal(loaded.accessCount, 1);
  assert.equal(loaded.strength > 0.3, true);
  store.close();
});

test("consolidate prunes weak memories, reinforces recent, and detects duplicates", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.memorize("c1", "parallel memory pattern", { tags: ["topic"] });
  await store.memorize("c2", "parallel memory pattern", { tags: ["topic"] });

  const db = store as unknown as {
    db: {
      getByKey: (key: string) => {
        id: string;
        text: string;
        essence: string;
        details: string | null;
        tags: string | null;
        trigger_conditions: string | null;
        importance: number;
        strength: number;
        decay_tau: number;
        last_accessed_at: string | null;
        access_count: number;
        metadata: string | null;
        created_at: string;
        updated_at: string;
        search_text: string;
        embedding: string | null;
        key: string;
      };
      upsertByKey: (row: {
        id: string;
        text: string;
        essence: string;
        details: string | null;
        tags: string | null;
        trigger_conditions: string | null;
        importance: number;
        strength: number;
        decay_tau: number;
        last_accessed_at: string | null;
        access_count: number;
        metadata: string | null;
        created_at: string;
        updated_at: string;
        search_text: string;
        embedding: string | null;
        key: string;
      }) => void;
    };
  };
  const weak = db.db.getByKey("c1");
  const recent = db.db.getByKey("c2");
  assert.ok(weak);
  assert.ok(recent);
  const stale = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  db.db.upsertByKey({
    ...weak,
    strength: 0.01,
    access_count: 0,
    last_accessed_at: stale,
    updated_at: stale,
  });
  db.db.upsertByKey({
    ...recent,
    strength: 0.2,
    access_count: 0,
    last_accessed_at: now,
    updated_at: now,
  });

  const report = await store.consolidate();
  assert.equal(report.forgotten >= 1, true);
  assert.equal(report.potentialDuplicates.length >= 1, true);
  assert.equal(report.total, 1);
  store.close();
});

test("reflect groups by primary tag in markdown", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.memorize("r1", "task plan", { tags: ["work"] });
  await store.memorize("r2", "evening walk", { tags: ["life"] });
  const text = await store.reflect();
  assert.equal(text.includes("## work"), true);
  assert.equal(text.includes("## life"), true);
  assert.equal(text.includes("r1"), true);
  assert.equal(text.includes("r2"), true);
  store.close();
});

test("count returns total entries", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.store("count one");
  await store.store("count two");
  assert.equal(await store.count(), 2);
  await store.clear();
  assert.equal(await store.count(), 0);
  store.close();
});

test("ForgettingCurve computeRetention and reinforceOnAccess", () => {
  const now = new Date().toISOString();
  const retention = computeRetention(1, now, 86400000, 0.5, 2);
  assert.equal(retention >= 0.95, true);
  const weak = computeRetention(1, new Date(Date.now() - 86400000).toISOString(), 86400000, 0.5, 0);
  assert.equal(weak < 0.7, true);
  assert.equal(reinforceOnAccess(0.7, 0.5), 0.85);
  assert.equal(reinforceOnAccess(0.95, 1), 1);
});

test("memory-store old behavior still holds for list(0) boundary", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const entries = await store.list(0);
  assert.equal(entries.length, 0);
  store.close();
});

test("list(1) returns only the latest entry", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const first = await store.store("first entry");
  await new Promise((resolve) => setTimeout(resolve, 10));
  const second = await store.store("second entry");
  const entries = await store.list(1);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, second);
  assert.equal(entries[0]?.id !== first, true);
  store.close();
});

test("metadata round-trip with nested objects", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const metadata = {
    source: "test",
    nested: { key: "value", arr: [1, 2, 3] },
    tags: ["tag1", "tag2"],
  };
  const id = await store.store("test text", metadata);
  const entries = await store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, id);
  assert.equal(JSON.stringify(entries[0]?.metadata), JSON.stringify(metadata));
  store.close();
});

test("clear then store still works", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.store("first");
  await store.clear();
  const id = await store.store("after clear");
  const entries = await store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, id);
  assert.equal(entries[0]?.text, "after clear");
  store.close();
});

test("search with special characters in query", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.store("test with special chars: @#$%^&*()");
  const entries = await store.search("@#$%^&*()");
  assert.equal(Array.isArray(entries), true);
  store.close();
});

test("recall supports cross-language semantic matches", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.memorize("kimi-fix", "Resolved the Kimi 400 error in the CLI login flow", {
    tags: ["support"],
    details: "Fix involved clearing stale session state before retrying authentication.",
  });
  await store.memorize("other-note", "Calendar sync completed successfully", {
    tags: ["ops"],
    details: "No authentication issues remained after rollout.",
  });

  const entries = await store.recall("kimi 오류", 5, { semantic: true });
  assert.equal(entries[0]?.key, "kimi-fix");
  store.close();
});

function createTestEmbedding(input: string): number[] {
  const dimensions = 384;
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of tokenizeForTest(input)) {
    const index = Math.abs(hashToken(token)) % dimensions;
    vector[index] += 1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => value / magnitude);
}

function tokenizeForTest(input: string): string[] {
  const aliasMap = new Map<string, string>([
    ["오류", "error"],
    ["错误", "error"],
    ["錯誤", "error"],
    ["故障", "error"],
  ]);

  return (input.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).map((token) => aliasMap.get(token) ?? token);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}
