import { ok } from "node:assert/strict";
import test from "node:test";

import {
  runLarkChannelSetup,
  runSlackChannelStatus,
  runTelegramChannelSetup,
} from "./channel-handlers.js";
import { createTestDeps, TEST_CONFIG } from "./test-helpers.js";

test("telegram setup persists token", async () => {
  let saved: typeof TEST_CONFIG = TEST_CONFIG;
  const deps = createTestDeps();
  deps.saveIdentity = async (config) => {
    saved = config;
  };

  await runTelegramChannelSetup("tg-token", undefined, deps);

  ok(saved.channels.telegram.token === "tg-token");
  ok(/Saved Telegram config/.test(deps.output()));
});

test("slack status reports configured channel", async () => {
  const configuredIdentity: typeof TEST_CONFIG = {
    ...TEST_CONFIG,
    channels: {
      ...TEST_CONFIG.channels,
      slack: {
        botToken: "xoxb",
        appToken: "xapp",
        cliCommand: "codex exec",
      },
    },
  };
  const deps = createTestDeps();
  deps.loadIdentity = async () => configuredIdentity;

  await runSlackChannelStatus(deps);

  ok(/Slack configured: yes/.test(deps.output()));
  ok(/Slack CLI command: codex exec/.test(deps.output()));
});

test("lark setup persists credentials", async () => {
  let saved: typeof TEST_CONFIG = TEST_CONFIG;
  const deps = createTestDeps();
  deps.saveIdentity = async (config) => {
    saved = config;
  };

  await runLarkChannelSetup("cli_appid", "cli_secret", undefined, "oc_notify", deps);

  ok(saved.channels.lark.appId === "cli_appid");
  ok(saved.channels.lark.appSecret === "cli_secret");
  ok(saved.channels.lark.notifyChatId === "oc_notify");
  ok(/Saved Lark config/.test(deps.output()));
});
