import { spawnSync } from "node:child_process";

import { DISCORD_TIMEOUT_MS } from "./format.js";

type CliAdapter = {
  args: string[];
  command: string;
};

type DetectCliAdapter = (deps?: {
  env?: Record<string, string | undefined>;
  warn?: (message: string) => void;
}) => Promise<CliAdapter | null>;

type CliRunnerDeps = {
  loadDetectCliAdapter: () => Promise<DetectCliAdapter>;
  spawnSync: typeof spawnSync;
};

let cliRunnerDeps: CliRunnerDeps = {
  async loadDetectCliAdapter() {
    const moduleUrl = new URL("../../../daemon/dist/index.js", import.meta.url);
    const daemonModule = await import(moduleUrl.href) as {
      detectCliAdapter: DetectCliAdapter;
    };
    return daemonModule.detectCliAdapter;
  },
  spawnSync,
};

export async function runDiscordCliPrompt(
  prompt: string,
  cliCommand?: string,
): Promise<string> {
  const env = buildCliEnv(cliCommand);
  const detectCliAdapter = await cliRunnerDeps.loadDetectCliAdapter();
  const adapter = await detectCliAdapter({ env, warn() {} });
  if (!adapter) {
    throw new Error("未找到可用的 CLI 适配器。");
  }
  const result = cliRunnerDeps.spawnSync(adapter.command, [...adapter.args, prompt], {
    encoding: "utf8",
    env,
    maxBuffer: 10 * 1024 * 1024,
    timeout: DISCORD_TIMEOUT_MS,
  });
  if (result.error?.message.includes("ETIMEDOUT")) {
    throw new Error("处理超时（30 秒），请稍后重试。");
  }
  if (result.status !== 0) {
    const failure = result.stderr.trim() || result.stdout.trim() || "CLI 执行失败。";
    throw new Error(failure);
  }
  return result.stdout.trim() || result.stderr.trim();
}

export function setCliRunnerDepsForTests(deps: Partial<CliRunnerDeps>): void {
  cliRunnerDeps = { ...cliRunnerDeps, ...deps };
}

export function resetCliRunnerDepsForTests(): void {
  cliRunnerDeps = {
    async loadDetectCliAdapter() {
      const moduleUrl = new URL("../../../daemon/dist/index.js", import.meta.url);
      const daemonModule = await import(moduleUrl.href) as {
        detectCliAdapter: DetectCliAdapter;
      };
      return daemonModule.detectCliAdapter;
    },
    spawnSync,
  };
}

function buildCliEnv(cliCommand?: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env ?? {})) {
    if (key !== "CLAUDECODE" && typeof value === "string") {
      env[key] = value;
    }
  }
  if (cliCommand && cliCommand.trim() !== "") {
    env.VA_CLAW_CLI = cliCommand.trim();
  }
  return env;
}
