import type { Bot } from "grammy";

export type StartTelegramChannelConfig = {
  token: string;
  cliCommand?: string;
};

export type TelegramChannel = {
  bot: Bot;
  cliCommand: string;
  token: string;
};

export type TelegramCliResult =
  | { type: "success"; text: string }
  | { type: "timeout" }
  | { type: "error"; text: string };
