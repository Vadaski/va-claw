import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import {
  DEFAULT_CONFIG_PATH,
  getDaemonStatus,
  installDaemonService,
  loadIdentity,
  runInstallWizard,
  saveIdentity,
  startDaemon as startDaemonProcess,
  stopDaemon,
  toClaudeMdSnippet,
  toCodexSystemPrompt,
  uninstallDaemonService,
} from "./deps-exports.js";
import {
  clear,
  consolidate,
  count,
  get,
  list,
  memorize,
  recall,
  reflect,
  search,
  update,
  forget,
} from "@va-claw/memory";
import { installSkill, listSkills, loadSkill, removeSkill } from "../../skills/dist/index.js";
import type { VaClawConfig } from "@va-claw/daemon";

import {
  fileExists,
  resolveClaudeMdPath,
  resolveCodexInstructionsPath,
  resolveClawRegistryPath,
  resolveMemoryDbPath,
  upsertManagedBlock,
  removeManagedBlock,
  wrapCodexPrompt,
} from "./install-files.js";
import type { CliDeps } from "./types.js";

type ChannelModule = {
  startSlackChannel(config: unknown): Promise<unknown>;
  startLarkChannel(config: unknown): Promise<unknown>;
  startTelegramChannel(config: unknown): Promise<unknown>;
  stopLarkChannel(channel: unknown): Promise<void>;
  stopSlackChannel(channel: unknown): Promise<void>;
  stopTelegramChannel(channel: unknown): Promise<void>;
};

type LarkNotifierModule = {
  sendLarkMessage(
    config: {
      appId: string;
      appSecret: string;
      notifyChatId?: string;
      cliCommand?: string;
    },
    chatId: string,
    text: string,
  ): Promise<boolean>;
};

export function createDefaultCliDeps(): CliDeps {
  return {
    claudePath: resolveClaudeMdPath(),
    codexPath: resolveCodexInstructionsPath(),
    configPath: DEFAULT_CONFIG_PATH,
    memoryDbPath: resolveMemoryDbPath(),
    clawRegistryPath: resolveClawRegistryPath(),
    platform: process.platform,
    spawnSync,
    stdout: process.stdout,
    stderr: process.stderr,
    fileExists,
    readTextFile: (path) => readFile(path, "utf8"),
    upsertManagedBlock,
    removeManagedBlock,
    wrapCodexPrompt,
    loadIdentity: () => loadIdentity(),
    saveIdentity: (config) => saveIdentity(config),
    runInstallWizard,
    toClaudeMdSnippet,
    toCodexSystemPrompt,
    installDaemonService,
    uninstallDaemonService,
    startDaemon: (config) =>
      startDaemonProcess(config, {
        wakeDeps: createWakeDeps(config),
      }),
    stopDaemon,
    getDaemonStatus,
    memoryMemorize: (key, essence, options) => memorize(key, essence, options),
    memoryGet: (key) => get(key),
    memoryUpdate: (key, changes) => update(key, changes),
    memoryForget: (key) => forget(key),
    memoryRecall: (query, limit) => recall(query, limit),
    memoryConsolidate: () => consolidate(),
    memoryReflect: () => reflect(),
    memoryCount: () => count(),
    memorySearch: (query, limit) => search(query, limit),
    memoryList: (limit) => list(limit),
    memoryClear: () => clear(),
    startTelegramChannel: (config) =>
      loadChannelsModule().then((module) => module.startTelegramChannel(config) as ReturnType<CliDeps["startTelegramChannel"]>),
    stopTelegramChannel: (channel) =>
      loadChannelsModule().then((module) => module.stopTelegramChannel(channel) as ReturnType<CliDeps["stopTelegramChannel"]>),
    startLarkChannel: (config) =>
      loadChannelsModule().then((module) => module.startLarkChannel(config) as ReturnType<CliDeps["startLarkChannel"]>),
    stopLarkChannel: (channel) =>
      loadChannelsModule().then((module) => module.stopLarkChannel(channel) as ReturnType<CliDeps["stopLarkChannel"]>),
    startSlackChannel: (config) =>
      loadChannelsModule().then((module) => module.startSlackChannel(config) as ReturnType<CliDeps["startSlackChannel"]>),
    stopSlackChannel: (channel) =>
      loadChannelsModule().then((module) => module.stopSlackChannel(channel) as ReturnType<CliDeps["stopSlackChannel"]>),
    skillInstall: (content, name) => installSkill(content, name),
    skillList: (dir) => listSkills(dir),
    skillLoad: (nameOrPath) => loadSkill(nameOrPath),
    skillRemove: (name) => removeSkill(name),
    confirm: (message) => askForConfirmation(message),
    prompt: (message, initialValue) => askForValue(message, initialValue),
  };
}

async function askForConfirmation(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const value = await rl.question(`${message} [y/N] `);
    return ["y", "yes"].includes(value.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

async function askForValue(message: string, initialValue = ""): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = initialValue.trim() === "" ? "" : ` [${initialValue}]`;
  try {
    const value = await rl.question(`${message}${suffix} `);
    return value.trim() === "" ? initialValue : value.trim();
  } finally {
    rl.close();
  }
}

async function loadChannelsModule(): Promise<ChannelModule> {
  const moduleUrl = new URL("../../channels/dist/index.js", import.meta.url);
  return import(moduleUrl.href) as Promise<ChannelModule>;
}

function createWakeDeps(config: VaClawConfig): {
  notifyLark?: (chatId: string, text: string) => Promise<boolean>;
} {
  const notifyChatId = config.channels.lark.notifyChatId?.trim() ?? "";
  if (
    notifyChatId === ""
    || config.channels.lark.appId.trim() === ""
    || config.channels.lark.appSecret.trim() === ""
  ) {
    return {};
  }

  return {
    notifyLark: async (chatId, text) => {
      const larkModule = await loadLarkModule();
      return larkModule.sendLarkMessage(config.channels.lark, chatId, text);
    },
  };
}

async function loadLarkModule(): Promise<LarkNotifierModule> {
  const moduleUrl = new URL("../../channels/lark/dist/index.js", import.meta.url);
  return import(moduleUrl.href) as Promise<LarkNotifierModule>;
}
