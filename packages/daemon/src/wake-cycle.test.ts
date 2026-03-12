import assert from "node:assert/strict";
import test from "node:test";

import { runWakeCycle } from "./wake-cycle.js";
import type { VaClawConfig } from "./types.js";

const TEST_CONFIG: VaClawConfig = {
  name: "va-claw",
  persona: "test persona",
  systemPrompt: "test system prompt",
  wakePrompt: "load coding context",
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
    spawn: (_command, args = []) => {
      spawnArgs = [...args];
      return { status: 0, stdout: "wake complete", stderr: "", output: [], signal: null };
    },
    storeMemory: async (text) => {
      storedText = text;
      return "memory-id";
    },
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
    spawn: () => ({
      status: 0,
      stdout: cliOutput,
      stderr: "",
      output: [],
      signal: null,
    }),
    storeMemory: async (text, metadata) => {
      storedText = text;
      storedMetadata = metadata as Record<string, unknown>;
      return "memory-id";
    },
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

test("wake-cycle returns null and does not write memory when CLI exits non-zero", async () => {
  let storeCalled = false;
  const warnings: string[] = [];

  const wokeAt = await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "claude", command: "claude", args: ["-p"] }),
    listSkills: async () => [],
    spawn: () => ({
      status: 1,
      stdout: "",
      stderr: "CLI execution failed",
      output: [],
      signal: null,
    }),
    storeMemory: async () => {
      storeCalled = true;
      return "memory-id";
    },
    warn: (message) => warnings.push(message),
    now: () => new Date(),
  });

  assert.equal(wokeAt, null);
  assert.equal(storeCalled, false);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.includes("wake failed"), true);
});

test("wake-cycle unsets CLAUDECODE and CLAUDE_CODE_SESSION in child env", async () => {
  let capturedEnv: Record<string, unknown> = Object.create(null);

  await runWakeCycle(TEST_CONFIG, {
    detect: async () => ({ name: "codex", command: "codex", args: ["exec"] }),
    listSkills: async () => [],
    spawn: (_command, _args, options: Record<string, unknown> | undefined = Object.create(null)) => {
      capturedEnv = (options?.env ?? Object.create(null)) as Record<string, unknown>;
      return {
        status: 0,
        stdout: "success",
        stderr: "",
        output: [],
        signal: null,
      };
    },
    storeMemory: async () => "memory-id",
    now: () => new Date(),
  });

  assert.equal((capturedEnv as Record<string, unknown>).CLAUDECODE, undefined);
  assert.equal((capturedEnv as Record<string, unknown>).CLAUDE_CODE_SESSION, undefined);
});
