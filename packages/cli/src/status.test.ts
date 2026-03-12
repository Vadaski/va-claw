import { ok } from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
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
