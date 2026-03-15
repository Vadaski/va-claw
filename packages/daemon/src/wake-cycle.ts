import { spawn } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

import { store } from "../../memory/dist/index.js";
import { injectSkillIntoPrompt, listSkills, matchesSkillQuery } from "../../skills/dist/index.js";
import { formatRecentSessionContext, readRecentSessionContext } from "./session-journal.js";
import type { VaClawConfig } from "./types.js";
import { detectCliAdapter } from "./cli-adapter.js";

type WakeExitCode = number | "crash" | "spawn_error" | "timeout";
type WakeLogEntry = {
  timestamp: string;
  taskId?: string;
  durationMs: number;
  exitCode: WakeExitCode;
  timedOut: boolean;
  outputSnippet: string;
};
type WakeProcessOptions = {
  cwd: string;
  env: Record<string, string | undefined>;
};
type WakeProcessResult = {
  combinedOutput: string;
  exitCode: WakeExitCode;
  stderr: string;
  stdout: string;
};
type WakeDeps = {
  detect?: typeof detectCliAdapter;
  executeWake?: (
    command: string,
    args: string[],
    options: WakeProcessOptions,
    timeoutMs: number,
  ) => Promise<WakeProcessResult>;
  injectSkill?: typeof injectSkillIntoPrompt;
  listSkills?: typeof listSkills;
  notifyLark?: (chatId: string, text: string) => Promise<boolean>;
  readRecentSessionContext?: typeof readRecentSessionContext;
  storeMemory?: typeof store;
  warn?: (message: string) => void;
  now?: () => Date;
  writeWakeLog?: (entry: WakeLogEntry) => Promise<void>;
};

const DEFAULT_WARN = (message: string) => console.warn(message);
const DEFAULT_WAKE_TIMEOUT_MS = 300_000;
const OUTPUT_SNIPPET_LIMIT = 2_048;
const OUTPUT_BUFFER_LIMIT = 10 * 1024 * 1024; // 10 MB, same as old spawnSync maxBuffer

let wakeRunning = false;

export async function runWakeCycle(
  config: VaClawConfig,
  deps: WakeDeps = {},
): Promise<Date | null> {
  if (wakeRunning) {
    (deps.warn ?? DEFAULT_WARN)("[va-claw/daemon] skipping wake: previous wake still running");
    return null;
  }
  wakeRunning = true;
  try {
    return await _runWakeCycleInner(config, deps);
  } finally {
    wakeRunning = false;
  }
}

async function _runWakeCycleInner(
  config: VaClawConfig,
  deps: WakeDeps = {},
): Promise<Date | null> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now();
  let combinedOutput = "";

  try {
    const adapter = await (deps.detect ?? detectCliAdapter)({ warn: deps.warn });
    if (!adapter) {
      return null;
    }
    const prompt = await resolveWakePrompt(config, deps);
    const timeoutMs = resolveWakeTimeoutMs(config);
    const wakeArgs = [...adapter.args, prompt];
    const wakeOptions = {
      cwd: process.cwd(),
      env: {
        ...readProcessEnv(),
        CLAUDECODE: undefined,
        CLAUDE_CODE_SESSION: undefined,
      },
    };
    const result = await (deps.executeWake ?? executeWakeProcess)(
      adapter.command,
      wakeArgs,
      wakeOptions,
      timeoutMs,
    );

    combinedOutput = result.combinedOutput;
    const finishedAt = now();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    if (result.exitCode !== 0) {
      await writeWakeLogSafe(
        {
          timestamp: startedAt.toISOString(),
          durationMs: Math.max(0, durationMs),
          exitCode: result.exitCode,
          timedOut: result.exitCode === "timeout",
          outputSnippet: tailOutput(result.combinedOutput),
        },
        deps,
      );
      (deps.warn ?? DEFAULT_WARN)(
        result.exitCode === "timeout"
          ? `[va-claw/daemon] ${adapter.name} wake timed out after ${timeoutMs}ms.`
          : `[va-claw/daemon] ${adapter.name} wake failed: ${readFailureOutput(result.stderr, result.combinedOutput)}`,
      );
      return null;
    }

    await (deps.storeMemory ?? store)(result.stdout, {
      source: "va-claw-daemon",
      kind: "wake",
      cli: adapter.name,
      identity: config.name,
      wokeAt: finishedAt.toISOString(),
    });
    const notifyChatId = config.channels.lark.notifyChatId?.trim() ?? "";
    if (notifyChatId !== "") {
      const summary = result.stdout.slice(0, 1_000);
      void Promise.resolve(deps.notifyLark?.(notifyChatId, summary)).catch((error: unknown) => {
        (deps.warn ?? DEFAULT_WARN)(`[va-claw/daemon] lark notify failed: ${String(error)}`);
      });
    }
    await writeWakeLogSafe(
      {
        timestamp: startedAt.toISOString(),
        durationMs: Math.max(0, durationMs),
        exitCode: 0,
        timedOut: false,
        outputSnippet: tailOutput(result.combinedOutput),
      },
      deps,
    );
    return finishedAt;
  } catch (error) {
    const failedAt = now();
    await writeWakeLogSafe(
      {
        timestamp: startedAt.toISOString(),
        durationMs: Math.max(0, failedAt.getTime() - startedAt.getTime()),
        exitCode: "crash",
        timedOut: false,
        outputSnippet: tailOutput(combinedOutput),
      },
      deps,
    );
    (deps.warn ?? DEFAULT_WARN)(`[va-claw/daemon] wake crashed: ${String(error)}`);
    return null;
  }
}

async function executeWakeProcess(
  command: string,
  args: string[],
  options: WakeProcessOptions,
  timeoutMs: number,
): Promise<WakeProcessResult> {
  let child: ReturnType<typeof spawn>;

  try {
    child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return {
      combinedOutput: String(error),
      exitCode: "spawn_error",
      stderr: String(error),
      stdout: "",
    };
  }

  let stdout = "";
  let stderr = "";
  let combinedOutput = "";
  let settled = false;
  let combinedSize = 0;
  let stdoutSize = 0;
  let stderrSize = 0;

  child.stdout.on("data", (chunk) => {
    const text = String(chunk);
    if (stdoutSize < OUTPUT_BUFFER_LIMIT) {
      stdout += text;
      stdoutSize += text.length;
    }
    if (combinedSize < OUTPUT_BUFFER_LIMIT) {
      combinedOutput += text;
      combinedSize += text.length;
    }
  });
  child.stderr.on("data", (chunk) => {
    const text = String(chunk);
    if (stderrSize < OUTPUT_BUFFER_LIMIT) {
      stderr += text;
      stderrSize += text.length;
    }
    if (combinedSize < OUTPUT_BUFFER_LIMIT) {
      combinedOutput += text;
      combinedSize += text.length;
    }
  });

  return await new Promise<WakeProcessResult>((resolve) => {
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      // Send SIGTERM; give the child 5 s to exit gracefully, then SIGKILL.
      // We do NOT resolve until the child closes so that the caller's
      // serialization guard (wakeRunning) is held for the full cleanup window.
      child.kill("SIGTERM");
      const killTimer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* already gone */ }
      }, 5_000);
      // Capture result values now (before the child closes) and resolve only
      // after the "close" event fires, ensuring the process is truly gone.
      const timeoutResult: WakeProcessResult = {
        combinedOutput,
        exitCode: "timeout",
        stderr,
        stdout,
      };
      child.once("close", () => {
        clearTimeout(killTimer);
        resolve(timeoutResult);
      });
    }, timeoutMs);

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      const message = String(error);
      stderr = stderr === "" ? message : `${stderr}\n${message}`;
      combinedOutput += message;
      resolve({
        combinedOutput,
        exitCode: "spawn_error",
        stderr,
        stdout,
      });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        combinedOutput,
        exitCode: typeof code === "number" ? code : 1,
        stderr,
        stdout,
      });
    });
  });
}

function readProcessEnv(): Record<string, string | undefined> {
  return ((process as typeof process & { env?: Record<string, string | undefined> }).env ?? {});
}

function readFailureOutput(stderr: string, combinedOutput: string): string {
  const candidate = stderr.trim() !== "" ? stderr : combinedOutput;
  const text = candidate.trim();
  return text === "" ? "unknown error" : tailOutput(text, 200);
}

function resolveWakeTimeoutMs(config: VaClawConfig): number {
  return typeof config.wakeTimeoutMs === "number" && Number.isFinite(config.wakeTimeoutMs) && config.wakeTimeoutMs > 0
    ? config.wakeTimeoutMs
    : DEFAULT_WAKE_TIMEOUT_MS;
}

function tailOutput(text: string, limit = OUTPUT_SNIPPET_LIMIT): string {
  return text.length <= limit ? text : text.slice(-limit);
}

async function writeWakeLogSafe(entry: WakeLogEntry, deps: WakeDeps): Promise<void> {
  try {
    await (deps.writeWakeLog ?? writeWakeLog)(entry);
  } catch (error) {
    (deps.warn ?? DEFAULT_WARN)(`[va-claw/daemon] failed to write wake.log: ${String(error)}`);
  }
}

async function writeWakeLog(entry: WakeLogEntry): Promise<void> {
  const logPath = resolve(homedir(), ".va-claw", "wake.log");
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

async function resolveWakePrompt(config: VaClawConfig, deps: WakeDeps): Promise<string> {
  let basePrompt = config.wakePrompt;
  try {
    const skills = await (deps.listSkills ?? listSkills)();
    basePrompt = skills
      .filter((skill) => matchesSkillQuery(skill, config.wakePrompt))
      .reduce(
        (prompt, skill) => (deps.injectSkill ?? injectSkillIntoPrompt)(skill, prompt),
        config.wakePrompt,
      );
  } catch (error) {
    (deps.warn ?? DEFAULT_WARN)(`[va-claw/daemon] skill injection skipped: ${String(error)}`);
  }

  try {
    const recent = await (deps.readRecentSessionContext ?? readRecentSessionContext)({
      limit: 10,
      maxChars: 2_000,
    });
    const contextBlock = formatRecentSessionContext(recent);
    return contextBlock === "" ? basePrompt : `${contextBlock}\n${basePrompt}`;
  } catch (error) {
    (deps.warn ?? DEFAULT_WARN)(`[va-claw/daemon] session context skipped: ${String(error)}`);
    return basePrompt;
  }
}
