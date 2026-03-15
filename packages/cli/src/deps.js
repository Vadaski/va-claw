import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import {
  appendSessionJournalEntry,
  DEFAULT_CONFIG_PATH,
  formatSessionJournalEntry,
  getDaemonStatus,
  installDaemonService,
  loadIdentity,
  readRecentSessionContext,
  resolveSessionJournalPath,
  runInstallWizard,
  saveIdentity,
  startDaemon as startDaemonProcess,
  stopDaemon,
  toClaudeMdSnippet,
  toCodexSystemPrompt,
  uninstallDaemonService
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
  forget
} from "@va-claw/memory";
import { installSkill, listSkills, loadSkill, removeSkill } from "../../skills/dist/index.js";
import {
  fileExists,
  resolveClaudeMdPath,
  resolveCodexInstructionsPath,
  resolveClawRegistryPath,
  resolveMemoryDbPath,
  upsertManagedBlock,
  removeManagedBlock,
  wrapCodexPrompt
} from "./install-files.js";
function createDefaultCliDeps() {
  const sessionJournalPath = resolveSessionJournalPath();
  return {
    claudePath: resolveClaudeMdPath(),
    codexPath: resolveCodexInstructionsPath(),
    configPath: DEFAULT_CONFIG_PATH,
    memoryDbPath: resolveMemoryDbPath(),
    sessionJournalPath,
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
    startDaemon: (config) => startDaemonProcess(config, {
      wakeDeps: createWakeDeps(config)
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
    appendSessionEntry: (entry) => appendSessionJournalEntry(entry, sessionJournalPath),
    readRecentSessionEntries: (limit, maxChars) => readRecentSessionContext({ limit, maxChars }, sessionJournalPath),
    formatSessionEntry: formatSessionJournalEntry,
    startTelegramChannel: (config) => loadChannelsModule().then((module) => module.startTelegramChannel(config)),
    stopTelegramChannel: (channel) => loadChannelsModule().then((module) => module.stopTelegramChannel(channel)),
    startLarkChannel: (config) => loadChannelsModule().then((module) => module.startLarkChannel(config)),
    stopLarkChannel: (channel) => loadChannelsModule().then((module) => module.stopLarkChannel(channel)),
    startSlackChannel: (config) => loadChannelsModule().then((module) => module.startSlackChannel(config)),
    stopSlackChannel: (channel) => loadChannelsModule().then((module) => module.stopSlackChannel(channel)),
    skillInstall: (content, name) => installSkill(content, name),
    skillList: (dir) => listSkills(dir),
    skillLoad: (nameOrPath) => loadSkill(nameOrPath),
    skillRemove: (name) => removeSkill(name),
    confirm: (message) => askForConfirmation(message),
    prompt: (message, initialValue) => askForValue(message, initialValue)
  };
}
async function askForConfirmation(message) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const value = await rl.question(`${message} [y/N] `);
    return ["y", "yes"].includes(value.trim().toLowerCase());
  } finally {
    rl.close();
  }
}
async function askForValue(message, initialValue = "") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = initialValue.trim() === "" ? "" : ` [${initialValue}]`;
  try {
    const value = await rl.question(`${message}${suffix} `);
    return value.trim() === "" ? initialValue : value.trim();
  } finally {
    rl.close();
  }
}
async function loadChannelsModule() {
  const moduleUrl = new URL("../../channels/dist/index.js", import.meta.url);
  return import(moduleUrl.href);
}
function createWakeDeps(config) {
  const notifyChatId = config.channels.lark.notifyChatId?.trim() ?? "";
  if (notifyChatId === "" || config.channels.lark.appId.trim() === "" || config.channels.lark.appSecret.trim() === "") {
    return {};
  }
  return {
    notifyLark: async (chatId, text) => {
      const larkModule = await loadLarkModule();
      return larkModule.sendLarkMessage(config.channels.lark, chatId, text);
    }
  };
}
async function loadLarkModule() {
  const moduleUrl = new URL("../../channels/lark/dist/index.js", import.meta.url);
  return import(moduleUrl.href);
}
export {
  createDefaultCliDeps
};
