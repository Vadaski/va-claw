import { spawnSync } from "node:child_process";
import { createDefaultCliDeps } from "./deps.js";
const TEST_CONFIG = {
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
      autoStart: false
    },
    telegram: {
      token: "",
      cliCommand: ""
    },
    slack: {
      botToken: "",
      appToken: "",
      cliCommand: ""
    },
    lark: {
      appId: "",
      appSecret: "",
      cliCommand: "",
      notifyChatId: ""
    }
  }
};
function createTestDeps(overrides = {}) {
  let output = "";
  const stream = {
    write(chunk) {
      output += chunk;
      return true;
    }
  };
  const base = createDefaultCliDeps();
  const deps = {
    ...base,
    claudePath: "/tmp/claude.md",
    codexPath: "/tmp/instructions.md",
    configPath: "/tmp/config.json",
    memoryDbPath: "/tmp/memory.db",
    sessionJournalPath: "/tmp/session-journal.jsonl",
    clawRegistryPath: "/tmp/claws.json",
    platform: "linux",
    spawnSync: overrides.spawnSync ?? ((command, args, options) => spawnSync(command, args, options)),
    stdout: stream,
    stderr: stream,
    fileExists: overrides.fileExists ?? (async () => false),
    loadIdentity: overrides.loadIdentity ?? (async () => TEST_CONFIG),
    saveIdentity: overrides.saveIdentity ?? (async () => {
    }),
    runInstallWizard: overrides.runInstallWizard ?? (async () => TEST_CONFIG),
    installDaemonService: overrides.installDaemonService ?? (async () => {
    }),
    uninstallDaemonService: overrides.uninstallDaemonService ?? (async () => {
    }),
    startDaemon: overrides.startDaemon ?? (async () => {
    }),
    stopDaemon: overrides.stopDaemon ?? (async () => {
    }),
    getDaemonStatus: overrides.getDaemonStatus ?? (async () => ({ running: false, wakeCount: 0, discord: "disconnected" })),
    memorySearch: overrides.memorySearch ?? (async () => []),
    memoryMemorize: overrides.memoryMemorize ?? (async () => ({ id: "id", key: "key", text: "", essence: "", tags: [], triggerConditions: [], importance: 0.5, strength: 1, decayTau: 864e5, accessCount: 0, metadata: null, createdAt: "", updatedAt: "" })),
    memoryGet: overrides.memoryGet ?? (async () => void 0),
    memoryUpdate: overrides.memoryUpdate ?? (async () => void 0),
    memoryForget: overrides.memoryForget ?? (async () => false),
    memoryRecall: overrides.memoryRecall ?? (async () => []),
    memoryConsolidate: overrides.memoryConsolidate ?? (async () => ({ forgotten: 0, strengthened: 0, total: 0, potentialDuplicates: [] })),
    memoryReflect: overrides.memoryReflect ?? (async () => ""),
    memoryCount: overrides.memoryCount ?? (async () => 0),
    memoryList: overrides.memoryList ?? (async () => []),
    memoryClear: overrides.memoryClear ?? (async () => {
    }),
    appendSessionEntry: overrides.appendSessionEntry ?? (async ({ role, summary, timestamp }) => ({
      timestamp: timestamp ?? "2026-03-12T00:00:00.000Z",
      role,
      summary
    })),
    readRecentSessionEntries: overrides.readRecentSessionEntries ?? (async () => []),
    formatSessionEntry: overrides.formatSessionEntry ?? ((entry) => `[${entry.timestamp}] ${entry.role}: ${entry.summary}`),
    startTelegramChannel: overrides.startTelegramChannel ?? (async () => ({ bot: {}, cliCommand: "va-claw", token: "" })),
    stopTelegramChannel: overrides.stopTelegramChannel ?? (async () => {
    }),
    startLarkChannel: overrides.startLarkChannel ?? (async () => ({ appId: "", appSecret: "", cliCommand: "va-claw", listener: {} })),
    stopLarkChannel: overrides.stopLarkChannel ?? (async () => {
    }),
    startSlackChannel: overrides.startSlackChannel ?? (async () => ({ app: {}, appToken: "", botToken: "", cliCommand: "va-claw" })),
    stopSlackChannel: overrides.stopSlackChannel ?? (async () => {
    }),
    readTextFile: overrides.readTextFile ?? (async () => ""),
    skillInstall: overrides.skillInstall ?? (async () => "/tmp/my-skill.md"),
    skillList: overrides.skillList ?? (async () => []),
    skillLoad: overrides.skillLoad ?? (async () => ({
      name: "my-skill",
      description: "Test skill",
      version: "1.0.0",
      triggers: ["test"],
      content: "Test content",
      path: "/tmp/my-skill.md"
    })),
    skillRemove: overrides.skillRemove ?? (async () => {
    }),
    confirm: overrides.confirm ?? (async () => true),
    prompt: overrides.prompt ?? (async (_message, initialValue = "") => initialValue),
    ...overrides,
    output: () => output
  };
  return deps;
}
export {
  TEST_CONFIG,
  createTestDeps
};
