import { spawnSync } from "node:child_process";

export type CliAdapter = {
  name: string;
  command: string;
  args: string[];
};

type CliDeps = {
  env?: Record<string, string | undefined>;
  runWhich?: (command: string) => string | null;
  warn?: (message: string) => void;
};

const DEFAULT_WARN = (message: string) => console.warn(message);
const CLI_CANDIDATES = ["claude-copilot", "claude", "codex"] as const;

export async function detectCliAdapter(deps: CliDeps = {}): Promise<CliAdapter | null> {
  const runWhich = deps.runWhich ?? whichCommandExists;
  const configuredCommand = readEnv(deps.env).VA_CLAW_CLI?.trim();
  if (configuredCommand) {
    return toCliAdapter(configuredCommand, configuredCommand);
  }
  for (const name of CLI_CANDIDATES) {
    const command = runWhich(name);
    if (command) {
      return toCliAdapter(name, command);
    }
  }
  (deps.warn ?? DEFAULT_WARN)(
    "[va-claw/daemon] no supported CLI is available in PATH; skipping wake.",
  );
  return null;
}

export function whichCommandExists(command: string): string | null {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  const resolved = typeof result.stdout === "string" ? result.stdout.trim() : "";
  return result.status === 0 && resolved !== "" ? resolved : null;
}

function toCliAdapter(name: string, command: string): CliAdapter {
  return { name, command, args: name === "codex" ? ["exec", "--full-auto"] : ["-p"] };
}

function readEnv(env?: Record<string, string | undefined>): Record<string, string | undefined> {
  return env ?? ((process as typeof process & { env?: Record<string, string | undefined> }).env ?? {});
}
