import { ok } from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { toClaudeMdSnippet, toCodexSystemPrompt } from "@va-claw/identity";

import { runCli } from "./program.js";
import { createTestDeps, TEST_CONFIG } from "./test-helpers.js";

test("identity renderers include memory protocol rules in full and codex blocks", () => {
  const claudeContent = toClaudeMdSnippet(TEST_CONFIG);
  const codexContent = toCodexSystemPrompt(TEST_CONFIG);

  ok(/Memory protocol:/.test(claudeContent));
  ok(/va-claw memory recall/.test(claudeContent));
  ok(/va-claw memory memorize/.test(claudeContent));
  ok(/Do not memorize every message/.test(claudeContent));

  ok(/Memory protocol:/.test(codexContent));
  ok(/va-claw memory recall/.test(codexContent));
  ok(/va-claw memory memorize/.test(codexContent));
  ok(/Do not memorize every message/.test(codexContent));
});

test("install injects memory rules and installs default protocol skills", async () => {
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
  ok(/Memory protocol:/.test(content));
  ok(/va-claw memory recall/.test(content));

  const fetchCalls: string[] = [];
  const installedSkills: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    fetchCalls.push(url);
    return new Response(`---\nname: mock\n---\n# ${url}\n`, { status: 200 });
  }) as typeof fetch;

  try {
    const deps = createTestDeps({
      fileExists: async () => false,
      runInstallWizard: async () => TEST_CONFIG,
      skillInstall: async (_content, name) => {
        installedSkills.push(name);
        return `/tmp/${name}.md`;
      },
    });

    await runCli(["node", "va-claw", "install", "--for", "claude-code"], deps);
  } finally {
    globalThis.fetch = originalFetch;
  }

  ok(fetchCalls.some((url) => /claw-fleet-protocol\.md$/.test(url)));
  ok(fetchCalls.some((url) => /memory-protocol\.md$/.test(url)));
  ok(installedSkills.includes("claw-fleet-protocol"));
  ok(installedSkills.includes("memory-protocol"));
});
