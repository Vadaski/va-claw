import assert, { equal, notEqual } from "node:assert/strict";
import test from "node:test";

import { runWakeCycle } from "./wake-cycle.js";
import type { VaClawConfig } from "./types.js";

const TEST_CONFIG: VaClawConfig = {
  name: "va-claw",
  persona: "test persona",
  systemPrompt: "test system prompt",
  wakePrompt: "load coding context",
  wakeTimeoutMs: 300_000,
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

test("runWakeCycle injects matching skills into the wake prompt", async () => {
  let spawnArgs: string[] = [];
  let storedText = "";

  const wokeAt = await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [
      {
        name: "coding-agent",
        description: "Adds coding guidance",
        version: "1.0.0",
        triggers: ["coding", "debug"],
        content: "Follow coding instructions.",
        path: "/tmp/coding-agent.md",
      },
    ],
    readRecentSessionContext: async () => [],
    executeWake: async (_command, args = []) => {
      spawnArgs = [...args];
      return {
        exitCode: 0,
        stdout: "wake complete",
        stderr: "",
        combinedOutput: "wake complete",
      };
    },
    storeMemory: async (text) => {
      storedText = text;
      return "memory-id";
    },
    writeWakeLog: async () => {},
    now: () => new Date("2026-03-12T12:00:00.000Z"),
  });

  assert.equal(wokeAt?.toISOString(), "2026-03-12T12:00:00.000Z");
  assert.equal(
    JSON.stringify(spawnArgs),
    JSON.stringify([
    "exec",
    "load coding context\n\n[Skill: coding-agent@1.0.0]\nFollow coding instructions.",
  ]),
  );
  assert.equal(storedText, "wake complete");
});

// ========== 补充测试 ==========

test("wake-cycle CLI output is written to memory with correct metadata", async () => {
  let storedText = "";
  let storedMetadata: unknown = null;
  const cliOutput = "CLI execution result\nwith multiple lines";

  const wokeAt = await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec", "--full-auto"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [],
    executeWake: async () => ({
      exitCode: 0,
      stdout: cliOutput,
      stderr: "",
      combinedOutput: cliOutput,
    }),
    storeMemory: async (text, metadata) => {
      storedText = text;
      storedMetadata = metadata as Record<string, unknown>;
      return "memory-id";
    },
    writeWakeLog: async () => {},
    now: () => new Date("2026-03-12T12:30:00.000Z"),
  });

  assert.equal(wokeAt !== null, true);
  assert.equal(storedText, cliOutput);
  const metadata = (storedMetadata ?? {}) as {
    source?: string;
    kind?: string;
    cli?: string;
    identity?: string;
    wokeAt?: string;
  };
  assert.equal(metadata.source, "va-claw-daemon");
  assert.equal(metadata.kind, "wake");
  assert.equal(metadata.cli, "codex");
  assert.equal(metadata.identity, TEST_CONFIG.name);
  assert.equal(metadata.wokeAt, "2026-03-12T12:30:00.000Z");
});

test("wake-cycle pushes a truncated summary to configured lark chat without blocking", async () => {
  let notifiedChatId = "";
  let notifiedText = "";
  let notifyCalled = false;

  const wokeAt = await runWakeCycle(
    {
      ...TEST_CONFIG,
      channels: {
        ...TEST_CONFIG.channels,
        lark: {
          ...TEST_CONFIG.channels.lark,
          notifyChatId: "oc_notify",
        },
      },
    },
    {
      detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
      listSkills: async () => [],
      readRecentSessionContext: async () => [],
      executeWake: async () => ({
        exitCode: 0,
        stdout: "x".repeat(1_200),
        stderr: "",
        combinedOutput: "x".repeat(1_200),
      }),
      storeMemory: async () => "memory-id",
      notifyLark: async (chatId, text) => {
        notifyCalled = true;
        notifiedChatId = chatId;
        notifiedText = text;
        return await new Promise<boolean>(() => {});
      },
      writeWakeLog: async () => {},
      now: () => new Date("2026-03-12T12:31:00.000Z"),
    },
  );

  assert.equal(wokeAt?.toISOString(), "2026-03-12T12:31:00.000Z");
  assert.equal(notifyCalled, true);
  assert.equal(notifiedChatId, "oc_notify");
  assert.equal(notifiedText.length, 1_000);
});

test("wake-cycle returns null and does not write memory when CLI exits non-zero", async () => {
  let storeCalled = false;
  let logEntry: Record<string, unknown> | null = null;
  const warnings: string[] = [];

  const wokeAt = await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "claude", command: "claude", args: ["-p"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [],
    executeWake: async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "CLI execution failed",
      combinedOutput: "CLI execution failed",
    }),
    storeMemory: async () => {
      storeCalled = true;
      return "memory-id";
    },
    warn: (message) => warnings.push(message),
    writeWakeLog: async (entry) => {
      logEntry = entry as Record<string, unknown>;
    },
    now: () => new Date(),
  });

  assert.equal(wokeAt, null);
  assert.equal(storeCalled, false);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.includes("wake failed"), true);
  const nonZeroLog = (logEntry ?? {}) as Record<string, unknown>;
  assert.equal(nonZeroLog["exitCode"], 1);
  assert.equal(nonZeroLog["timedOut"], false);
  assert.equal(nonZeroLog["outputSnippet"], "CLI execution failed");
});

test("wake-cycle unsets CLAUDECODE and CLAUDE_CODE_SESSION in child env", async () => {
  let capturedEnv: Record<string, unknown> = Object.create(null);
  let capturedTimeoutMs = 0;

  await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [],
    executeWake: async (_command, _args, options, timeoutMs) => {
      capturedEnv = options.env as Record<string, unknown>;
      capturedTimeoutMs = timeoutMs;
      return {
        exitCode: 0,
        stdout: "success",
        stderr: "",
        combinedOutput: "success",
      };
    },
    storeMemory: async () => "memory-id",
    writeWakeLog: async () => {},
    now: () => new Date(),
  });

  assert.equal((capturedEnv as Record<string, unknown>).CLAUDECODE, undefined);
  assert.equal((capturedEnv as Record<string, unknown>).CLAUDE_CODE_SESSION, undefined);
  assert.equal(capturedTimeoutMs, 300_000);
});

test("wake-cycle logs timeout without crashing the daemon", async () => {
  let logEntry: Record<string, unknown> | null = null;
  const warnings: string[] = [];

  const wokeAt = await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [],
    executeWake: async () => ({
      exitCode: "timeout",
      stdout: "partial output",
      stderr: "",
      combinedOutput: "partial output",
    }),
    writeWakeLog: async (entry) => {
      logEntry = entry as Record<string, unknown>;
    },
    warn: (message) => warnings.push(message),
    now: (() => {
      const timestamps = [
        new Date("2026-03-12T12:00:00.000Z"),
        new Date("2026-03-12T12:02:30.000Z"),
      ];
      return () => timestamps.shift() ?? new Date("2026-03-12T12:02:30.000Z");
    })(),
  });

  assert.equal(wokeAt, null);
  const timeoutLog = (logEntry ?? {}) as Record<string, unknown>;
  assert.equal(timeoutLog["exitCode"], "timeout");
  assert.equal(timeoutLog["timedOut"], true);
  assert.equal(timeoutLog["durationMs"], 150000);
  assert.equal(warnings[0]?.includes("timed out"), true);
});

test("wake-cycle logs crashes and returns null instead of throwing", async () => {
  let logEntry: Record<string, unknown> | null = null;
  const warnings: string[] = [];

  const wokeAt = await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [],
    executeWake: async () => ({
      exitCode: 0,
      stdout: "success",
      stderr: "",
      combinedOutput: "success",
    }),
    storeMemory: async () => {
      throw new Error("sqlite busy");
    },
    writeWakeLog: async (entry) => {
      logEntry = entry as Record<string, unknown>;
    },
    warn: (message) => warnings.push(message),
    now: (() => {
      const timestamps = [
        new Date("2026-03-12T12:00:00.000Z"),
        new Date("2026-03-12T12:00:10.000Z"),
      ];
      return () => timestamps.shift() ?? new Date("2026-03-12T12:00:10.000Z");
    })(),
  });

  assert.equal(wokeAt, null);
  const crashLog = (logEntry ?? {}) as Record<string, unknown>;
  assert.equal(crashLog["exitCode"], "crash");
  assert.equal(crashLog["timedOut"], false);
  assert.equal(warnings[0]?.includes("wake crashed"), true);
});

test("wake-cycle logs use the structured JSONL wake.log schema", async () => {
  let logEntry: Record<string, unknown> | null = null;

  await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    executeWake: async () => ({
      exitCode: 0,
      stdout: "done",
      stderr: "",
      combinedOutput: "x".repeat(3_000),
    }),
    storeMemory: async () => "memory-id",
    writeWakeLog: async (entry) => {
      logEntry = entry as Record<string, unknown>;
    },
    now: (() => {
      const timestamps = [
        new Date("2026-03-12T14:00:00.000Z"),
        new Date("2026-03-12T14:00:03.000Z"),
      ];
      return () => timestamps.shift() ?? new Date("2026-03-12T14:00:03.000Z");
    })(),
  });

  const wakeLog = (logEntry ?? {}) as Record<string, unknown>;
  assert.equal(wakeLog["timestamp"], "2026-03-12T14:00:00.000Z");
  assert.equal(wakeLog["durationMs"], 3000);
  assert.equal(wakeLog["exitCode"], 0);
  assert.equal(wakeLog["timedOut"], false);
  assert.equal(typeof wakeLog["outputSnippet"], "string");
  assert.equal((wakeLog["outputSnippet"] as string).length, 2048);
  assert.equal("taskId" in wakeLog, false);
});

test("wake-cycle serializes concurrent wakes: second call is skipped while first is running", async () => {
  const warnings: string[] = [];
  let executeCount = 0;

  // The first wake will hold the lock while we call the second one concurrently.
  let releaseLock!: () => void;
  const lockPromise = new Promise<void>((res) => { releaseLock = res; });

  const firstWakePromise = runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [],
    executeWake: async () => {
      executeCount += 1;
      await lockPromise; // block until we release
      return { exitCode: 0, stdout: "first", stderr: "", combinedOutput: "first" };
    },
    storeMemory: async () => "id",
    writeWakeLog: async () => {},
    warn: (m) => warnings.push(m),
    now: () => new Date(),
  });

  // Give the first wake a tick to acquire the lock
  await new Promise((r) => setTimeout(r as () => void, 0));

  // Second concurrent call — should be skipped
  const secondResult = await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [],
    executeWake: async () => {
      executeCount += 1;
      return { exitCode: 0, stdout: "second", stderr: "", combinedOutput: "second" };
    },
    storeMemory: async () => "id",
    writeWakeLog: async () => {},
    warn: (m) => warnings.push(m),
    now: () => new Date(),
  });

  assert.equal(secondResult, null);
  assert.equal(warnings.some((w) => w.includes("skipping wake")), true);

  // Release first wake and confirm it completes normally
  releaseLock();
  const firstResult = await firstWakePromise;
  notEqual(firstResult, null);
  assert.equal(executeCount, 1); // second wake never ran
});

test("runWakeCycle prepends recent session context before the wake prompt", async () => {
  let spawnArgs: string[] = [];

  await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    readRecentSessionContext: async () => [
      {
        timestamp: "2026-03-12T11:58:00.000Z",
        role: "user",
        summary: "Asked for a repo status summary",
      },
      {
        timestamp: "2026-03-12T11:59:00.000Z",
        role: "assistant",
        summary: "Found one failing test in daemon wake-cycle",
      },
    ],
    executeWake: async (_command, args = []) => {
      spawnArgs = [...args];
      return {
        exitCode: 0,
        stdout: "wake complete",
        stderr: "",
        combinedOutput: "wake complete",
      };
    },
    storeMemory: async () => "memory-id",
    writeWakeLog: async () => {},
    now: () => new Date("2026-03-12T12:00:00.000Z"),
  });

  assert.equal(
    spawnArgs[1],
    [
      "Recent session context:",
      "- 2026-03-12T11:58:00.000Z user: Asked for a repo status summary",
      "- 2026-03-12T11:59:00.000Z assistant: Found one failing test in daemon wake-cycle",
      "",
      "load coding context",
    ].join("\n"),
  );
});
