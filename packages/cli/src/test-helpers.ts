import { spawnSync } from "node:child_process";

import type { DaemonStatus, VaClawConfig } from "@va-claw/daemon";
import type { MemoryEntry } from "@va-claw/memory";
import type { SkillDefinition } from "../../skills/dist/index.js";

import { createDefaultCliDeps } from "./deps.js";
import type { CliDeps } from "./types.js";

export const TEST_CONFIG: VaClawConfig = {
  name: "Nova",
  persona: "Precise and calm.",
  systemPrompt: "Act with continuity.",
  wakePrompt: "Load memory first.",
  loopInterval: "*/15 * * * *",
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

export function createTestDeps(overrides: Partial<CliDeps> = {}): CliDeps & { output: () => string } {
  let output = "";
  const stream = {
    write(chunk: string) {
      output += chunk;
      return true;
    },
  };
  const base = createDefaultCliDeps();
  return {
    ...base,
    claudePath: "/tmp/claude.md",
    codexPath: "/tmp/instructions.md",
    configPath: "/tmp/config.json",
    memoryDbPath: "/tmp/memory.db",
    platform: "linux",
    spawnSync: overrides.spawnSync ?? ((command, args, options) => spawnSync(command, args, options)),
    stdout: stream,
    stderr: stream,
    fileExists: overrides.fileExists ?? (async () => false),
    loadIdentity: overrides.loadIdentity ?? (async () => TEST_CONFIG),
    saveIdentity: overrides.saveIdentity ?? (async () => {}),
    runInstallWizard: overrides.runInstallWizard ?? (async () => TEST_CONFIG),
    installDaemonService: overrides.installDaemonService ?? (async () => {}),
    uninstallDaemonService: overrides.uninstallDaemonService ?? (async () => {}),
    startDaemon: overrides.startDaemon ?? (async () => {}),
    stopDaemon: overrides.stopDaemon ?? (async () => {}),
    getDaemonStatus:
      overrides.getDaemonStatus ??
      (async () => ({ running: false, wakeCount: 0, discord: "disconnected" } satisfies DaemonStatus)),
    memorySearch: overrides.memorySearch ?? (async () => [] satisfies MemoryEntry[]),
    memoryList: overrides.memoryList ?? (async () => [] satisfies MemoryEntry[]),
    memoryClear: overrides.memoryClear ?? (async () => {}),
    startTelegramChannel:
      overrides.startTelegramChannel ??
      (async () => ({ bot: {} as never, cliCommand: "va-claw", token: "" })),
    stopTelegramChannel: overrides.stopTelegramChannel ?? (async () => {}),
    startSlackChannel:
      overrides.startSlackChannel ??
      (async () => ({ app: {} as never, appToken: "", botToken: "", cliCommand: "va-claw" })),
    stopSlackChannel: overrides.stopSlackChannel ?? (async () => {}),
    readTextFile: overrides.readTextFile ?? (async () => ""),
    skillInstall: overrides.skillInstall ?? (async () => "/tmp/my-skill.md"),
    skillList: overrides.skillList ?? (async () => [] satisfies SkillDefinition[]),
    skillLoad: overrides.skillLoad ?? (async () => ({
      name: "my-skill",
      description: "Test skill",
      version: "1.0.0",
      triggers: ["test"],
      content: "Test content",
      path: "/tmp/my-skill.md",
    })),
    skillRemove: overrides.skillRemove ?? (async () => {}),
    confirm: overrides.confirm ?? (async () => true),
    prompt: overrides.prompt ?? (async (_message, initialValue = "") => initialValue),
    ...overrides,
    output: () => output,
  };
}
