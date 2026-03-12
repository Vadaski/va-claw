import { ok } from "node:assert/strict";
import test from "node:test";

import { runCli } from "./program.js";
import { createTestDeps, TEST_CONFIG } from "./test-helpers.js";

test("telegram setup persists token", async () => {
  let saved = TEST_CONFIG;
  const deps = createTestDeps({
    saveIdentity: async (config) => {
      saved = config;
    },
  });

  await runCli(["node", "va-claw", "channel", "telegram", "setup", "--token", "tg-token"], deps);

  ok(saved.channels.telegram.token === "tg-token");
  ok(/Saved Telegram config/.test(deps.output()));
});

test("slack status reports configured channel", async () => {
  const deps = createTestDeps({
    loadIdentity: async () => ({
      ...TEST_CONFIG,
      channels: {
        ...TEST_CONFIG.channels,
        slack: {
          botToken: "xoxb",
          appToken: "xapp",
          cliCommand: "codex exec",
        },
      },
    }),
  });

  await runCli(["node", "va-claw", "channel", "slack", "status"], deps);

  ok(/Slack configured: yes/.test(deps.output()));
  ok(/Slack CLI command: codex exec/.test(deps.output()));
});
