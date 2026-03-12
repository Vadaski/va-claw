import { ok } from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runCli } from "./program.js";
import { createTestDeps, TEST_CONFIG } from "./test-helpers.js";

test("install --for claude-code injects CLAUDE.md snippet", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-cli-install-"));
  const claudePath = join(dir, ".claude", "CLAUDE.md");
  const deps = createTestDeps({
    claudePath,
    codexPath: join(dir, ".codex", "instructions.md"),
    configPath: join(dir, ".va-claw", "config.json"),
    fileExists: async () => false,
    runInstallWizard: async () => TEST_CONFIG,
  });

  await runCli(["node", "va-claw", "install", "--for", "claude-code"], deps);

  const content = await readFile(claudePath, "utf8");
  await rm(dir, { recursive: true, force: true });

  ok(/va-claw:identity:start/.test(content));
  ok(/Nova/.test(content));
});
