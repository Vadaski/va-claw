import { runLarkCli } from "./cli.js";
import type { LarkCliResult, LarkIncomingMessage, LarkListener } from "./types.js";

export function parseLarkPrompt(message: LarkIncomingMessage): string | null {
  const text = message.text.trim();
  if (text === "") {
    return null;
  }
  if (message.senderType === "app") {
    return null;
  }
  return text;
}

export function formatLarkReply(result: LarkCliResult): string {
  if (result.type === "success") {
    return result.text;
  }
  if (result.type === "timeout") {
    return "超时，请重试";
  }
  return `错误：${result.text}`;
}

export function createLarkMessageHandler(cliCommand?: string) {
  return async (message: LarkIncomingMessage, listener: LarkListener): Promise<void> => {
    const prompt = parseLarkPrompt(message);
    if (prompt === null) {
      return;
    }

    await listener.reply(message.messageId, "思考中...");
    const result = await runLarkCli(prompt, cliCommand);
    const reply = formatLarkReply(result);
    const replied = await listener.reply(message.messageId, reply);
    if (!replied) {
      await listener.sendToChat(message.chatId, reply);
    }
  };
}
