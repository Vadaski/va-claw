import type { IncomingDiscordMessage } from "./types.js";

export function buildDiscordPrompt(
  message: IncomingDiscordMessage,
  clientId: string,
): string {
  const content = stripBotMention(message.content, clientId).trim();
  const scope = message.isDirectMessage ? "Discord DM" : `Discord ${message.sourceLabel}`;
  return [
    `${scope} from ${message.authorName} (${message.authorId})`,
    "",
    content === "" ? "(empty message)" : content,
  ].join("\n");
}

export function shouldHandleDiscordMessage(
  message: IncomingDiscordMessage,
  clientId: string,
): boolean {
  if (message.isBot) {
    return false;
  }
  if (message.isDirectMessage) {
    return true;
  }
  return message.isMentioned(clientId);
}

function stripBotMention(content: string, clientId: string): string {
  return content
    .replace(new RegExp(`<@!?${escapeRegExp(clientId)}>`, "g"), "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
