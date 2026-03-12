import type { Context } from "grammy";

import { runTelegramCli } from "./cli.js";
import type { TelegramCliResult } from "./types.js";

export function parseTelegramPrompt(context: Context): string | null {
  const text = context.message?.text?.trim();
  if (!text) {
    return null;
  }
  if (context.chat?.type === "private") {
    return text;
  }
  const match = text.match(/^\/va-claw(?:@\S+)?(?:\s+(.*))?$/);
  return match ? (match[1] ?? "").trim() : null;
}

export function formatTelegramReply(result: TelegramCliResult): string {
  if (result.type === "success") {
    return result.text;
  }
  if (result.type === "timeout") {
    return "超时，请重试";
  }
  return `错误：${result.text}`;
}

export function createTelegramMessageHandler(cliCommand?: string) {
  return async (context: Context): Promise<void> => {
    const prompt = parseTelegramPrompt(context);
    if (prompt === null) {
      return;
    }

    const pending = await context.reply("思考中...");
    const result = await runTelegramCli(prompt, cliCommand);
    await context.api.editMessageText(context.chat?.id ?? 0, pending.message_id, formatTelegramReply(result));
  };
}
