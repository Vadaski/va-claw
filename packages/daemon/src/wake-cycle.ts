import { spawnSync } from "node:child_process";

import { store } from "../../memory/dist/index.js";
import { injectSkillIntoPrompt, listSkills, matchesSkillQuery } from "../../skills/dist/index.js";
import type { VaClawConfig } from "./types.js";
import { detectCliAdapter } from "./cli-adapter.js";

type WakeDeps = {
  detect?: typeof detectCliAdapter;
  injectSkill?: typeof injectSkillIntoPrompt;
  listSkills?: typeof listSkills;
  spawn?: typeof spawnSync;
  storeMemory?: typeof store;
  warn?: (message: string) => void;
  now?: () => Date;
};

const DEFAULT_WARN = (message: string) => console.warn(message);

export async function runWakeCycle(
  config: VaClawConfig,
  deps: WakeDeps = {},
): Promise<Date | null> {
  const adapter = await (deps.detect ?? detectCliAdapter)({ warn: deps.warn });
  if (!adapter) {
    return null;
  }
  const prompt = await resolveWakePrompt(config, deps);

  const spawnOptions = {
    cwd: process.cwd(),
    encoding: "utf8" as const,
    env: {
      ...readProcessEnv(),
      CLAUDECODE: undefined,
      CLAUDE_CODE_SESSION: undefined,
    },
    maxBuffer: 10 * 1024 * 1024,
  };
  const result = (deps.spawn ?? spawnSync)(adapter.command, [...adapter.args, prompt], spawnOptions);

  if (result.status !== 0) {
    (deps.warn ?? DEFAULT_WARN)(
      `[va-claw/daemon] ${adapter.name} wake failed: ${readStderr(result.stderr)}`,
    );
    return null;
  }

  const wokeAt = (deps.now ?? (() => new Date()))();
  await (deps.storeMemory ?? store)(result.stdout ?? "", {
    source: "va-claw-daemon",
    kind: "wake",
    cli: adapter.name,
    identity: config.name,
    wokeAt: wokeAt.toISOString(),
  });
  return wokeAt;
}

function readStderr(stderr: string | null | undefined): string {
  if (typeof stderr === "string" && stderr.trim() !== "") {
    return stderr.trim();
  }
  return "unknown error";
}

function readProcessEnv(): Record<string, string | undefined> {
  return ((process as typeof process & { env?: Record<string, string | undefined> }).env ?? {});
}

async function resolveWakePrompt(config: VaClawConfig, deps: WakeDeps): Promise<string> {
  try {
    const skills = await (deps.listSkills ?? listSkills)();
    return skills
      .filter((skill) => matchesSkillQuery(skill, config.wakePrompt))
      .reduce(
        (prompt, skill) => (deps.injectSkill ?? injectSkillIntoPrompt)(skill, prompt),
        config.wakePrompt,
      );
  } catch (error) {
    (deps.warn ?? DEFAULT_WARN)(`[va-claw/daemon] skill injection skipped: ${String(error)}`);
    return config.wakePrompt;
  }
}
