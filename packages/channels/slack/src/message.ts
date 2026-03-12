import type { SlackHandlerArgs } from "@slack/bolt";

import { runSlackCli } from "./cli.js";
import type { SlackCliResult } from "./types.js";

export type SlackEvent = {
  bot_id?: string;
  channel: string;
  channel_type?: string;
  subtype?: string;
  text?: string;
  ts: string;
  type: string;
};

export function parseSlackPrompt(event: SlackEvent): string | null {
  if (event.bot_id || event.subtype || !event.text?.trim()) {
    return null;
  }
  if (event.channel_type === "im") {
    return event.text.trim();
  }
  if (event.type !== "app_mention") {
    return null;
  }
  return event.text.replace(/<@[^>]+>/g, "").trim();
}

export function formatSlackReply(result: SlackCliResult): string {
  if (result.type === "success") {
    return result.text;
  }
  if (result.type === "timeout") {
    return "超时，请重试";
  }
  return `错误：${result.text}`;
}

export function createSlackEventHandler(cliCommand?: string) {
  return async ({ client, event, say }: SlackHandlerArgs<SlackEvent>): Promise<void> => {
    const prompt = parseSlackPrompt(event);
    if (prompt === null) {
      return;
    }

    const pending = await say({ text: "思考中..." });
    const result = await runSlackCli(prompt, cliCommand);
    await client.chat.update({
      channel: pending.channel,
      text: formatSlackReply(result),
      ts: pending.ts,
    });
  };
}
