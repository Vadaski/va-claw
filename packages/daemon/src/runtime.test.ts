import { equal } from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  getDaemonStatus,
  resetRuntimeDepsForTests,
  setRuntimeDepsForTests,
  startDaemon,
  stopDaemon,
} from "./runtime.js";
import type { VaClawConfig } from "./types.js";

const TEST_CONFIG: VaClawConfig = {
  name: "va-claw",
  persona: "test persona",
  systemPrompt: "test system prompt",
  wakePrompt: "wake up",
  loopInterval: "0 * * * *",
  channels: {
    discord: {
      token: "",
      clientId: "",
      cliCommand: "",
      autoStart: false,
    },
    telegram: {
      token: "",
      cliCommand: "",
    },
    slack: {
      botToken: "",
      appToken: "",
      cliCommand: "",
    },
    lark: {
      appId: "",
      appSecret: "",
      cliCommand: "",
    },
  },
};

afterEach(async () => {
  await stopDaemon();
  resetRuntimeDepsForTests();
});

test("startDaemon registers a cron scheduler", async () => {
  let scheduledPattern = "";
  let scheduled = false;

  setRuntimeDepsForTests({
    createScheduler(pattern) {
      scheduledPattern = pattern;
      scheduled = true;
      return { stop() {} };
    },
    wake: async () => null,
  });

  await startDaemon(TEST_CONFIG);
  const status = await getDaemonStatus();

  equal(scheduled, true);
  equal(scheduledPattern, TEST_CONFIG.loopInterval);
  equal(status.running, true);
  equal(status.discord, "disconnected");
});

test("stopDaemon stops the active scheduler", async () => {
  let stopCalls = 0;

  setRuntimeDepsForTests({
    createScheduler() {
      return {
        stop() {
          stopCalls += 1;
        },
      };
    },
    wake: async () => null,
  });

  await startDaemon(TEST_CONFIG);
  await stopDaemon();
  const status = await getDaemonStatus();

  equal(stopCalls, 1);
  equal(status.running, false);
  equal(status.discord, "disconnected");
});

test("startDaemon auto-starts discord when enabled", async () => {
  let receivedToken = "";
  let stopCalls = 0;

  setRuntimeDepsForTests({
    createScheduler() {
      return { stop() {} };
    },
    async startDiscord(config) {
      receivedToken = config.token;
      return {
        status() {
          return "connected";
        },
        async stop() {
          stopCalls += 1;
        },
      };
    },
    wake: async () => null,
  });

  await startDaemon({
    ...TEST_CONFIG,
    channels: {
      discord: {
        autoStart: true,
        cliCommand: "codex",
        clientId: "client-1",
        token: "token-1",
      },
      telegram: TEST_CONFIG.channels.telegram,
      slack: TEST_CONFIG.channels.slack,
      lark: TEST_CONFIG.channels.lark,
    },
  });
  const status = await getDaemonStatus();

  equal(receivedToken, "token-1");
  equal(status.discord, "connected");
  await stopDaemon();
  equal(stopCalls, 1);
});
