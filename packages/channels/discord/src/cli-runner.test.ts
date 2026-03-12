import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  resetCliRunnerDepsForTests,
  runDiscordCliPrompt,
  setCliRunnerDepsForTests,
} from "./cli-runner.js";

afterEach(() => {
  resetCliRunnerDepsForTests();
});

test("runDiscordCliPrompt unsets CLAUDECODE in env", async () => {
  let capturedEnv: Record<string, string | undefined> = {};

  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async () => ({ name: "codex", command: "codex", args: ["exec", "--full-auto"] });
    },
    spawnSync: (_command, _args, options) => {
      capturedEnv = options?.env ?? {};
      return {
        status: 0,
        stdout: "success",
        stderr: "",
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  await runDiscordCliPrompt("test prompt");

  assert.equal(capturedEnv.CLAUDECODE, undefined);
  assert.equal(capturedEnv.CLAUDE_CODE_SESSION, undefined);
});

test("runDiscordCliPrompt throws when no CLI adapter found", async () => {
  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async () => null;
    },
    spawnSync: () => {
      return {
        status: 1,
        stdout: "",
        stderr: "not found",
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  await assertRejects(
    () => runDiscordCliPrompt("test prompt"),
    /未找到可用的 CLI 适配器/
  );
});

test("runDiscordCliPrompt throws on timeout", async () => {
  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async () => ({ name: "codex", command: "codex", args: ["exec", "--full-auto"] });
    },
    spawnSync: () => {
      return {
        status: null,
        stdout: "",
        stderr: "",
        error: new Error("spawnSync ETIMEDOUT"),
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  await assertRejects(
    () => runDiscordCliPrompt("test prompt"),
    /处理超时/
  );
});

test("runDiscordCliPrompt throws on non-zero exit", async () => {
  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async () => ({ name: "codex", command: "codex", args: ["exec", "--full-auto"] });
    },
    spawnSync: () => {
      return {
        status: 1,
        stdout: "",
        stderr: "Error: something went wrong",
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  await assertRejects(
    () => runDiscordCliPrompt("test prompt"),
    /something went wrong/
  );
});

test("runDiscordCliPrompt returns output when CLI succeeds", async () => {
  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async () => ({ name: "codex", command: "codex", args: ["exec", "--full-auto"] });
    },
    spawnSync: () => {
      return {
        status: 0,
        stdout: "  success output  \n",
        stderr: "",
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  const output = await runDiscordCliPrompt("  Hello   ");
  assert.equal(output, "success output");
});

test("runDiscordCliPrompt returns trimmed stdout on success", async () => {
  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async () => ({ name: "codex", command: "codex", args: ["exec", "--full-auto"] });
    },
    spawnSync: () => {
      return {
        status: 0,
        stdout: "  trimmed output  \n",
        stderr: "",
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  const result = await runDiscordCliPrompt("test prompt");
  assert.equal(result, "trimmed output");
});

test("runDiscordCliPrompt returns stderr when stdout is empty", async () => {
  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async () => ({ name: "codex", command: "codex", args: ["exec", "--full-auto"] });
    },
    spawnSync: () => {
      return {
        status: 0,
        stdout: "",
        stderr: "  stderr output  ",
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  const result = await runDiscordCliPrompt("test prompt");
  assert.equal(result, "stderr output");
});

test("runDiscordCliPrompt uses VA_CLAW_CLI env override when provided", async () => {
  let capturedEnv: Record<string, string | undefined> = {};

  setCliRunnerDepsForTests({
    async loadDetectCliAdapter() {
      return async (options?: { env?: Record<string, string | undefined> }) => {
        capturedEnv = options?.env ?? {};
        return { name: "custom-cli", command: "/custom/path/cli", args: ["-p"] };
      };
    },
    spawnSync: () => {
      return {
        status: 0,
        stdout: "success",
        stderr: "",
        pid: 123,
        output: [],
        signal: null,
      };
    },
  });

  await runDiscordCliPrompt("test prompt", "my-custom-cli");
  assert.equal(capturedEnv.VA_CLAW_CLI, "my-custom-cli");
});

async function assertRejects(
  fn: () => Promise<unknown>,
  pattern: RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error("Expected promise to reject");
  } catch (error) {
    assert.equal(
      (error instanceof Error ? error.message : String(error)).match(pattern) !== null,
      true,
    );
  }
}
