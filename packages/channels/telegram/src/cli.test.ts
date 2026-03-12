import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCliCommand, runTelegramCli } from "./cli.js";
import type { TelegramCliResult } from "./types.js";

const noopTimeout = ((_: Parameters<typeof setTimeout>[0] | null, _delay?: number) => {
  return 0 as ReturnType<typeof setTimeout>;
}) as typeof setTimeout;

test("parseCliCommand splits quoted args", () => {
  const parsed = parseCliCommand('node --loader tsx "./bin/run.mjs"');

  assert.equal(parsed.command, "node");
  assert.equal(JSON.stringify(parsed.args), JSON.stringify(["--loader", "tsx", "./bin/run.mjs"]));
});

test("parseCliCommand handles single quotes", () => {
  const parsed = parseCliCommand("pnpm exec 'my command'");

  assert.equal(parsed.command, "pnpm");
  assert.equal(JSON.stringify(parsed.args), JSON.stringify(["exec", "my command"]));
});

test("parseCliCommand returns default command when input is undefined", () => {
  const parsed = parseCliCommand(undefined);

  assert.equal(parsed.command, "va-claw");
  assert.equal(JSON.stringify(parsed.args), JSON.stringify([]));
});

test("parseCliCommand returns default command when input is empty", () => {
  const parsed = parseCliCommand("");

  assert.equal(parsed.command, "va-claw");
  assert.equal(JSON.stringify(parsed.args), JSON.stringify([]));
});

test("parseCliCommand handles complex mixed quotes", () => {
  const parsed = parseCliCommand('node --arg1 "value with spaces" --arg2 \'another value\'');

  assert.equal(parsed.command, "node");
  assert.equal(
    JSON.stringify(parsed.args),
    JSON.stringify(["--arg1", "value with spaces", "--arg2", "another value"]),
  );
});

test("runTelegramCli returns success result with stdout", async () => {
  const mockChild = createMockChild({
    exitCode: 0,
    stdout: "CLI output\nSecond line",
    stderr: "",
  });

  const result = await runTelegramCli("test prompt", undefined, 60000, {
    spawnProcess: () => mockChild as never,
    setTimeoutFn: noopTimeout,
  });

  assert.equal(result.type, "success");
  assert.equal((result as Extract<TelegramCliResult, { type: "success" }>).text, "CLI output\nSecond line");
});

test("runTelegramCli returns error result on non-zero exit", async () => {
  const mockChild = createMockChild({
    exitCode: 1,
    stdout: "",
    stderr: "Error occurred",
  });

  const result = await runTelegramCli("test prompt", undefined, 60000, {
    spawnProcess: () => mockChild as never,
    setTimeoutFn: noopTimeout,
  });

  assert.equal(result.type, "error");
  assert.equal((result as Extract<TelegramCliResult, { type: "error" }>).text, "Error occurred");
});

test("runTelegramCli returns timeout result when killed", async () => {
  const mockChild = createMockChild({
    exitCode: null,
    stdout: "",
    stderr: "",
    neverExits: true,
  });

  let timeoutCalled = false;
  const result = await runTelegramCli("test prompt", undefined, 5000, {
    spawnProcess: () => mockChild as never,
    setTimeoutFn: ((fn) => {
      timeoutCalled = true;
      if (typeof fn === "function") {
        fn();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout,
  });

  assert.equal(timeoutCalled, true);
  assert.equal(result.type, "timeout");
});

test("runTelegramCli returns error with exit code when no stderr", async () => {
  const mockChild = createMockChild({
    exitCode: 2,
    stdout: "",
    stderr: "",
  });

  const result = await runTelegramCli("test prompt", undefined, 60000, {
    spawnProcess: () => mockChild as never,
    setTimeoutFn: noopTimeout,
  });

  assert.equal(result.type, "error");
  assert.equal(
    (result as Extract<TelegramCliResult, { type: "error" }>).text,
    "CLI exited with code 2"
  );
});

test("runTelegramCli unsets CLAUDECODE and CLAUDE_CODE_SESSION in env", async () => {
  const mockChild = createMockChild({
    exitCode: 0,
    stdout: "success",
    stderr: "",
  });

  let capturedEnv: Record<string, unknown> = {};
  await runTelegramCli("test prompt", undefined, 60000, {
    spawnProcess: (_cmd, _args, options) => {
      capturedEnv = options?.env ?? {};
      return mockChild as never;
    },
    setTimeoutFn: noopTimeout,
  });

  assert.equal(capturedEnv.CLAUDECODE, undefined);
  assert.equal(capturedEnv.CLAUDE_CODE_SESSION, undefined);
  assert.equal(capturedEnv.VA_CLAW_CHANNEL_MESSAGE, "test prompt");
});

test("runTelegramCli uses custom cliCommand", async () => {
  const mockChild = createMockChild({
    exitCode: 0,
    stdout: "custom cli output",
    stderr: "",
  });

  let capturedCommand = "";
  let capturedArgs: string[] = [];
  await runTelegramCli("test prompt", "custom-cli --flag", 60000, {
    spawnProcess: (cmd, args) => {
      capturedCommand = cmd;
      capturedArgs = [...(args ?? [])];
      return mockChild as never;
    },
    setTimeoutFn: noopTimeout,
  });

  assert.equal(capturedCommand, "custom-cli");
  assert.equal(JSON.stringify(capturedArgs), JSON.stringify(["--flag", "test prompt"]));
});

type MockChildOptions = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  neverExits?: boolean;
};

function createMockChild(options: MockChildOptions) {
  const stdoutChunks = [options.stdout];
  const stderrChunks = [options.stderr];
  let stdoutIndex = 0;
  let stderrIndex = 0;
  let closeHandler: ((code: number | null) => void) | null = null;

  return {
    stdout: {
      on(event: string, listener: (chunk: string) => void) {
        if (event === "data" && stdoutIndex < stdoutChunks.length) {
          listener(stdoutChunks[stdoutIndex++]);
        }
      },
    },
    stderr: {
      on(event: string, listener: (chunk: string) => void) {
        if (event === "data" && stderrIndex < stderrChunks.length) {
          listener(stderrChunks[stderrIndex++]);
        }
      },
    },
    on(event: string, listener: (code: number | null) => void) {
      if (event === "close") {
        closeHandler = listener;
        if (!options.neverExits) {
          setTimeout(() => closeHandler?.(options.exitCode), 0);
        }
      }
    },
    kill() {},
    simulateTimeout() {
      if (closeHandler) {
        // Simulate timeout path without invoking close.
        closeHandler = null;
      }
    },
  };
}
