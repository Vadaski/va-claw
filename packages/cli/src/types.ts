import type {
  LarkChannel,
  StartLarkChannelConfig,
  SlackChannel,
  StartSlackChannelConfig,
  StartTelegramChannelConfig,
  TelegramChannel,
} from "../../channels/dist/index.js";
import type { DaemonStatus, ServiceType, VaClawConfig } from "@va-claw/daemon";
import type { MemoryEntry } from "@va-claw/memory";
import type { SkillDefinition } from "../../skills/dist/index.js";

export type InstallTarget = "claude-code" | "codex" | "all";

export type MarkerPair = {
  start: string;
  end: string;
};

export type OutputStream = {
  write(chunk: string): boolean;
};

export type SpawnResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export type SpawnFn = (
  command: string,
  args: string[],
  options?: { encoding: "utf8" },
) => SpawnResult;

export type SessionRole = "user" | "assistant";

export type SessionJournalEntry = {
  timestamp: string;
  role: SessionRole;
  summary: string;
};

export type CliDeps = {
  claudePath: string;
  codexPath: string;
  configPath: string;
  memoryDbPath: string;
  sessionJournalPath: string;
  clawRegistryPath: string;
  platform: NodeJS.Platform;
  spawnSync: SpawnFn;
  stdout: OutputStream;
  stderr: OutputStream;
  fileExists: (path: string) => Promise<boolean>;
  readTextFile: (path: string) => Promise<string>;
  upsertManagedBlock: (path: string, block: string, markers: MarkerPair) => Promise<void>;
  removeManagedBlock: (path: string, markers: MarkerPair) => Promise<void>;
  wrapCodexPrompt: (prompt: string) => string;
  loadIdentity: () => Promise<VaClawConfig>;
  saveIdentity: (config: VaClawConfig) => Promise<void>;
  runInstallWizard: () => Promise<VaClawConfig>;
  toClaudeMdSnippet: (config: VaClawConfig) => string;
  toCodexSystemPrompt: (config: VaClawConfig) => string;
  installDaemonService: (type: ServiceType) => Promise<void>;
  uninstallDaemonService: (type: ServiceType) => Promise<void>;
  startDaemon: (config: VaClawConfig) => Promise<void>;
  stopDaemon: () => Promise<void>;
  getDaemonStatus: () => Promise<DaemonStatus>;
  memorySearch: (query: string, limit: number) => Promise<MemoryEntry[]>;
  memoryMemorize: (key: string, essence: string, options: {
    tags?: string[];
    details?: string;
    importance?: number;
  }) => Promise<MemoryEntry>;
  memoryGet: (key: string) => Promise<MemoryEntry | undefined>;
  memoryUpdate: (
    key: string,
    changes: {
      essence?: string;
      tags?: string[];
      details?: string;
      triggerConditions?: string[];
      importance?: number;
    },
  ) => Promise<MemoryEntry | undefined>;
  memoryForget: (key: string) => Promise<boolean>;
  memoryRecall: (query: string, limit: number) => Promise<MemoryEntry[]>;
  memoryConsolidate: () => Promise<{
    forgotten: number;
    strengthened: number;
    total: number;
    potentialDuplicates: [string, string][];
  }>;
  memoryReflect: () => Promise<string>;
  memoryCount: () => Promise<number>;
  memoryList: (limit: number) => Promise<MemoryEntry[]>;
  memoryClear: () => Promise<void>;
  appendSessionEntry: (entry: { role: SessionRole; summary: string; timestamp?: string }) => Promise<SessionJournalEntry>;
  readRecentSessionEntries: (limit: number, maxChars?: number) => Promise<SessionJournalEntry[]>;
  formatSessionEntry: (entry: SessionJournalEntry) => string;
  startTelegramChannel: (config: StartTelegramChannelConfig) => Promise<TelegramChannel>;
  stopTelegramChannel: (channel: TelegramChannel) => Promise<void>;
  startLarkChannel: (config: StartLarkChannelConfig) => Promise<LarkChannel>;
  stopLarkChannel: (channel: LarkChannel) => Promise<void>;
  startSlackChannel: (config: StartSlackChannelConfig) => Promise<SlackChannel>;
  stopSlackChannel: (channel: SlackChannel) => Promise<void>;
  skillInstall: (content: string, name: string) => Promise<string>;
  skillList: (dir?: string) => Promise<SkillDefinition[]>;
  skillLoad: (nameOrPath: string) => Promise<SkillDefinition>;
  skillRemove: (name: string) => Promise<void>;
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, initialValue?: string) => Promise<string>;
};
