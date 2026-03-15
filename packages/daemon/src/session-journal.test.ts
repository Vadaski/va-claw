import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  appendSessionJournalEntry,
  formatRecentSessionContext,
  formatSessionJournalEntry,
  readRecentSessionContext,
  readSessionJournalEntries,
} from "./session-journal.js";

test("session journal appends and recalls bounded recent context", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-session-journal-"));
  const journalPath = join(dir, "session-journal.jsonl");

  await appendSessionJournalEntry({ timestamp: "2026-03-12T00:00:00.000Z", role: "user", summary: "first entry" }, journalPath);
  await appendSessionJournalEntry({ timestamp: "2026-03-12T00:01:00.000Z", role: "assistant", summary: "second entry" }, journalPath);

  const entries = await readSessionJournalEntries(journalPath);
  const recent = await readRecentSessionContext({ limit: 1, maxChars: 2_000 }, journalPath);
  const fileContents = await readFile(journalPath, "utf8");

  assert.equal(entries.length, 2);
  assert.equal(recent.length, 1);
  assert.equal(recent[0]?.summary, "second entry");
  assert.equal(fileContents.includes("\"role\":\"user\""), true);
  assert.equal(formatSessionJournalEntry(entries[0]!).includes("user: first entry"), true);
  assert.equal(formatRecentSessionContext(recent).includes("Recent session context:"), true);

  await rm(journalPath, { force: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await rm(dir, { recursive: true, force: true } as any);
});

test("session journal trims summaries and respects max char budget", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-session-journal-"));
  const journalPath = join(dir, "session-journal.jsonl");

  await appendSessionJournalEntry({
    timestamp: "2026-03-12T00:00:00.000Z",
    role: "user",
    summary: `${"x".repeat(210)} tail`,
  }, journalPath);
  await appendSessionJournalEntry({
    timestamp: "2026-03-12T00:01:00.000Z",
    role: "assistant",
    summary: "short",
  }, journalPath);

  const entries = await readSessionJournalEntries(journalPath);
  const recent = await readRecentSessionContext({ limit: 10, maxChars: 40 }, journalPath);

  assert.equal(entries[0]?.summary.length, 200);
  assert.equal(recent.length, 1);
  assert.equal(recent[0]?.summary, "short");

  await rm(journalPath, { force: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await rm(dir, { recursive: true, force: true } as any);
});
