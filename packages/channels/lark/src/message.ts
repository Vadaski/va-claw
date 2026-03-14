import { resolveVaClawCliCommand, runLarkCli, runLarkCliCommand } from "./cli.js";
import type { LarkCliResult, LarkIncomingMessage, LarkListener } from "./types.js";

type LarkMessageDeps = {
  resolveVaClawCliCommand: typeof resolveVaClawCliCommand;
  runCli: typeof runLarkCli;
  runCliCommand: typeof runLarkCliCommand;
};

let larkMessageDeps: LarkMessageDeps = {
  resolveVaClawCliCommand,
  runCli: runLarkCli,
  runCliCommand: runLarkCliCommand,
};

const KNOWN_VA_CLAW_COMMANDS = new Set([
  "status",
  "memory list",
  "memory recall",
  "claw list",
  "claw status",
  "protocol",
]);

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

function tokenizeLarkCommand(text: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoteChar: "\"" | "'" | null = null;

  for (const char of text.trim()) {
    if (char === "\"" || char === "'") {
      if (quoteChar === char) {
        quoteChar = null;
        continue;
      }
      if (quoteChar === null) {
        quoteChar = char;
        continue;
      }
    }
    if (/\s/.test(char) && quoteChar === null) {
      if (current !== "") {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (current !== "") {
    tokens.push(current);
  }

  return tokens;
}

export function resolveVaClawCommand(text: string): string[] | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }

  const directMatch = /^va-claw\s+(.+)$/i.exec(trimmed);
  if (directMatch) {
    const command = directMatch[1]?.trim();
    const tokens = command ? tokenizeLarkCommand(command) : [];
    return tokens.length > 0 ? tokens : null;
  }

  const normalized = trimmed.replace(/\s+/g, " ");
  if (KNOWN_VA_CLAW_COMMANDS.has(normalized.toLowerCase())) {
    return normalized.toLowerCase().split(" ");
  }

  return null;
}

export function createLarkMessageHandler(cliCommand?: string) {
  return async (message: LarkIncomingMessage, listener: LarkListener): Promise<void> => {
    const prompt = parseLarkPrompt(message);
    if (prompt === null) {
      return;
    }

    await listener.reply(message.messageId, "思考中...");
    const directCommand = resolveVaClawCommand(prompt);
    const result = directCommand
      ? await larkMessageDeps.runCliCommand(directCommand, larkMessageDeps.resolveVaClawCliCommand())
      : await larkMessageDeps.runCli(prompt, cliCommand);
    const reply = formatLarkReply(result);
    const replied = await listener.reply(message.messageId, reply);
    if (!replied) {
      await listener.sendToChat(message.chatId, reply);
    }
  };
}

export function setLarkMessageDepsForTests(deps: Partial<LarkMessageDeps>): void {
  larkMessageDeps = { ...larkMessageDeps, ...deps };
}

export function resetLarkMessageDepsForTests(): void {
  larkMessageDeps = {
    resolveVaClawCliCommand,
    runCli: runLarkCli,
    runCliCommand: runLarkCliCommand,
  };
}
