import { Bot } from "grammy";

import { createTelegramMessageHandler } from "./message.js";
import type { StartTelegramChannelConfig, TelegramChannel } from "./types.js";

export async function startTelegramChannel(
  config: StartTelegramChannelConfig,
): Promise<TelegramChannel> {
  const bot = new Bot(config.token);
  bot.on("message:text", createTelegramMessageHandler(config.cliCommand));
  bot.catch((error) => {
    console.error("[va-claw/channel-telegram]", error);
  });
  await bot.start();
  return {
    bot,
    cliCommand: config.cliCommand ?? "va-claw",
    token: config.token,
  };
}

export async function stopTelegramChannel(channel: TelegramChannel): Promise<void> {
  channel.bot.stop();
}

export type {
  StartTelegramChannelConfig,
  TelegramChannel,
  TelegramCliResult,
} from "./types.js";
export { createTelegramMessageHandler, formatTelegramReply, parseTelegramPrompt } from "./message.js";
export { parseCliCommand, runTelegramCli } from "./cli.js";
