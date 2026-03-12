const DISCORD_MAX_LENGTH = 2000;
const TRUNCATED_SUFFIX = "\n\n[truncated]";

export const DISCORD_PLACEHOLDER = "正在思考...";
export const DISCORD_TIMEOUT_MS = 30_000;

export function formatDiscordReply(output: string): string {
  const content = output.trim() === "" ? "CLI 未返回内容。" : output.trim();
  return truncateDiscordMessage(content);
}

export function formatDiscordError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return truncateDiscordMessage(`处理失败：${message}`);
}

export function truncateDiscordMessage(content: string): string {
  if (content.length <= DISCORD_MAX_LENGTH) {
    return content;
  }
  return `${content.slice(0, DISCORD_MAX_LENGTH - TRUNCATED_SUFFIX.length)}${TRUNCATED_SUFFIX}`;
}
