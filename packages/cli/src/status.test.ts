import { ok } from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { runCli } from "./program.js";
import { createTestDeps } from "./test-helpers.js";

test("status output includes memory entry count", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-cli-status-"));
  const memoryDbPath = join(dir, ".va-claw", "memory.db");
  await mkdir(join(dir, ".va-claw"), { recursive: true });
  const db = new DatabaseSync(memoryDbPath);
  db.exec("CREATE TABLE memories (id TEXT, text TEXT, metadata TEXT, created_at TEXT, search_text TEXT, embedding TEXT)");
  db.exec("INSERT INTO memories VALUES ('1', 'first', NULL, '2026-03-12T00:00:00.000Z', 'first', NULL)");
  db.exec("INSERT INTO memories VALUES ('2', 'second', NULL, '2026-03-12T01:00:00.000Z', 'second', NULL)");
  db.close();

  const deps = createTestDeps({
    memoryDbPath,
    fileExists: async (path) => path === memoryDbPath,
  });

  await runCli(["node", "va-claw", "status"], deps);
  await rm(dir, { recursive: true, force: true });

  ok(/Memory entries: 2/.test(deps.output()));
});

test("protocol text output includes recent session summaries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-cli-protocol-"));
  const memoryDbPath = join(dir, ".va-claw", "memory.db");
  const sessionJournalPath = join(dir, ".va-claw", "session-journal.jsonl");
  await mkdir(join(dir, ".va-claw"), { recursive: true });
  const db = new DatabaseSync(memoryDbPath);
  db.exec("CREATE TABLE memories (id TEXT, text TEXT, metadata TEXT, created_at TEXT, search_text TEXT, embedding TEXT)");
  db.close();
  await writeFile(
    sessionJournalPath,
    [
      JSON.stringify({ timestamp: "2026-03-12T10:00:00.000Z", role: "user", summary: "Asked for test status" }),
      JSON.stringify({ timestamp: "2026-03-12T10:01:00.000Z", role: "assistant", summary: "Reported green build" }),
      "",
    ].join("\n"),
    "utf8",
  );

  const deps = createTestDeps({
    memoryDbPath,
    sessionJournalPath,
    fileExists: async (path) => path === memoryDbPath || path === sessionJournalPath,
    readRecentSessionEntries: async () => [
      { timestamp: "2026-03-12T10:00:00.000Z", role: "user", summary: "Asked for test status" },
      { timestamp: "2026-03-12T10:01:00.000Z", role: "assistant", summary: "Reported green build" },
    ],
  });

  await runCli(["node", "va-claw", "protocol", "--text"], deps);
  await rm(dir, { recursive: true, force: true });

  ok(/Recent session:/.test(deps.output()));
  ok(/Asked for test status/.test(deps.output()));
  ok(/Reported green build/.test(deps.output()));
});

test("session append and recall commands use session journal deps", async () => {
  const entries = [
    { timestamp: "2026-03-12T10:00:00.000Z", role: "user" as const, summary: "Asked for status" },
    { timestamp: "2026-03-12T10:01:00.000Z", role: "assistant" as const, summary: "Summarized daemon state" },
  ];
  const deps = createTestDeps({
    appendSessionEntry: async ({ role, summary }) => ({
      timestamp: "2026-03-12T10:01:00.000Z",
      role,
      summary,
    }),
    readRecentSessionEntries: async () => entries,
  });

  await runCli(["node", "va-claw", "session", "append", "--role", "user", "--summary", "Asked for status"], deps);
  await runCli(["node", "va-claw", "session", "recall", "--limit", "2"], deps);

  ok(/Asked for status/.test(deps.output()));
  ok(/Summarized daemon state/.test(deps.output()));
});
