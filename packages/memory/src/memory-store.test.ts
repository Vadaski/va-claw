import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryStore } from "./memory-store.js";

test("store then list returns the stored id", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const id = await store.store("remember this", { source: "test" });
  const entries = await store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, id);
  assert.equal(JSON.stringify(entries[0]?.metadata), JSON.stringify({ source: "test" }));
  store.close();
});

test("search hits keyword matches when vector search is unavailable", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.store("alpha project notes");
  await store.store("beta launch checklist");
  const entries = await store.search("launch", 5);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.text.includes("launch"), true);
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

// ========== 补充测试 ==========

test("store with empty string text", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const id = await store.store("");
  const entries = await store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, id);
  assert.equal(entries[0]?.text, "");
  store.close();
});

test("store with long text (>10KB)", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const longText = "x".repeat(15 * 1024);
  const id = await store.store(longText);
  const entries = await store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, id);
  assert.equal(entries[0]?.text.length, longText.length);
  store.close();
});

test("search returns empty array when no matches", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  await store.store("alpha project notes");
  await store.store("beta launch checklist");
  const entries = await store.search("nonexistent xyz 123", 5);
  assert.equal(entries.length, 0);
  store.close();
});

test("list(0) returns empty array", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const entries = await store.list(0);
  assert.equal(entries.length, 0);
  store.close();
});

test("list(1) returns only the latest entry", async () => {
  const store = new MemoryStore({ dbPath: ":memory:" });
  const id1 = await store.store("first entry");
  await new Promise((resolve) => setTimeout(resolve, 10));
  const id2 = await store.store("second entry");
  const entries = await store.list(1);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, id2);
  assert.equal(entries[0]?.id !== id1, true);
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
