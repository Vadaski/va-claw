import { spawn, spawnSync } from "node:child_process";

import type { LarkCliResult } from "./types.js";

const DEFAULT_CLI_COMMAND = "va-claw";

type SpawnResult = {
  kill(signal?: string): void;
  on(event: "close", listener: (code: number | null) => void): void;
  stderr: { on(event: "data", listener: (chunk: string | Uint8Array) => void): void };
  stdout: { on(event: "data", listener: (chunk: string | Uint8Array) => void): void };
};

type CliDeps = {
  setTimeoutFn?: typeof setTimeout;
  spawnProcess?: typeof spawn;
};

export function parseCliCommand(input?: string): { args: string[]; command: string } {
  const text = input?.trim() || DEFAULT_CLI_COMMAND;
  const parts = text.match(/"[^"]*"|'[^']*'|\S+/g) ?? [DEFAULT_CLI_COMMAND];
  const [command, ...args] = parts.map((part) => part.replace(/^['"]|['"]$/g, ""));
  return { args, command };
}

export function resolveVaClawCliCommand(): string {
  const result = spawnSync("which", [DEFAULT_CLI_COMMAND], { encoding: "utf8" });
  const resolved = typeof result.stdout === "string" ? result.stdout.trim() : "";
  return result.status === 0 && resolved !== "" ? resolved : DEFAULT_CLI_COMMAND;
}

export async function runLarkCli(
  prompt: string,
  cliCommand?: string,
  timeoutMs = 60_000,
  deps: CliDeps = {},
): Promise<LarkCliResult> {
  return runLarkCliCommand([prompt], cliCommand, timeoutMs, deps);
}

export async function runLarkCliCommand(
  promptArgs: string[],
  cliCommand?: string,
  timeoutMs = 60_000,
  deps: CliDeps = {},
): Promise<LarkCliResult> {
  const { args, command } = parseCliCommand(cliCommand);
  const child = (deps.spawnProcess ?? spawn)(command, [...args, ...promptArgs], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CLAUDECODE: undefined,
      CLAUDE_CODE_SESSION: undefined,
      VA_CLAW_CHANNEL_MESSAGE: promptArgs.join(" "),
    },
    stdio: ["ignore", "pipe", "pipe"],
  }) as SpawnResult;

  let stdout = "";
  let stderr = "";
  let settled = false;
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  return await new Promise<LarkCliResult>((resolve) => {
    const timer = (deps.setTimeoutFn ?? setTimeout)(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      resolve({ type: "timeout" });
    }, timeoutMs);

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ type: "success", text: stdout.trim() || "CLI 未返回内容" });
        return;
      }
      resolve({ type: "error", text: stderr.trim() || `CLI exited with code ${code ?? "unknown"}` });
    });
  });
}
