import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DISCORD_PLACEHOLDER,
  formatDiscordError,
  formatDiscordReply,
  truncateDiscordMessage,
} from "./format.js";

test("formatDiscordReply returns trimmed content when CLI outputs text", () => {
  const result = formatDiscordReply("  Hello, World!  ");
  assert.equal(result, "Hello, World!");
});

test("formatDiscordReply returns default message for empty output", () => {
  const result = formatDiscordReply("");
  assert.equal(result, "CLI 未返回内容。");
});

test("formatDiscordReply returns default message for whitespace-only output", () => {
  const result = formatDiscordReply("   \n\t   ");
  assert.equal(result, "CLI 未返回内容。");
});

test("formatDiscordReply truncates content over 2000 characters", () => {
  const longContent = "x".repeat(2500);
  const result = formatDiscordReply(longContent);

  assert.equal(result.length <= 2000, true);
  assert.equal(result.includes("[truncated]"), true);
});

test("formatDiscordError includes error message", () => {
  const error = new Error("Something went wrong");
  const result = formatDiscordError(error);

  assert.equal(/处理失败：/.test(result), true);
  assert.equal(/Something went wrong/.test(result), true);
});

test("formatDiscordError handles non-Error values", () => {
  const result = formatDiscordError("string error");
  assert.equal(/处理失败：string error/.test(result), true);
});

test("formatDiscordError truncates long error messages", () => {
  const longError = new Error("x".repeat(2500));
  const result = formatDiscordError(longError);

  assert.equal(result.length <= 2000, true);
  assert.equal(result.includes("[truncated]"), true);
});

test("truncateDiscordMessage returns original content when under limit", () => {
  const content = "Short message";
  const result = truncateDiscordMessage(content);

  assert.equal(result, content);
});

test("truncateDiscordMessage returns original content at exactly 2000 chars", () => {
  const content = "x".repeat(2000);
  const result = truncateDiscordMessage(content);

  assert.equal(result, content);
  assert.equal(result.length, 2000);
});

test("truncateDiscordMessage truncates content at 2001 characters", () => {
  const content = "x".repeat(2001);
  const result = truncateDiscordMessage(content);

  assert.equal(result.length <= 2000, true);
  assert.equal(result.includes("[truncated]"), true);
});

test("truncateDiscordMessage includes [truncated] suffix when truncating", () => {
  const longContent = "x".repeat(2500);
  const result = truncateDiscordMessage(longContent);

  assert.equal(result.endsWith("\n\n[truncated]"), true);
});

test("DISCORD_PLACEHOLDER is the expected Chinese text", () => {
  assert.equal(DISCORD_PLACEHOLDER, "正在思考...");
});
