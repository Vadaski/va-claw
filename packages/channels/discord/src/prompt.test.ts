import assert from "node:assert/strict";
import { test } from "node:test";

import { buildDiscordPrompt, shouldHandleDiscordMessage } from "./prompt.js";
import type { IncomingDiscordMessage } from "./types.js";

function createMockMessage(options: Partial<IncomingDiscordMessage> = {}): IncomingDiscordMessage {
  return {
    authorId: options.authorId ?? "user-123",
    authorName: options.authorName ?? "TestUser",
    content: options.content ?? "Hello",
    isBot: options.isBot ?? false,
    isDirectMessage: options.isDirectMessage ?? false,
    sourceLabel: options.sourceLabel ?? "#general",
    isMentioned: options.isMentioned ?? (() => false),
    send: options.send ?? (async () => ({ edit: async () => {} })),
  };
}

test("buildDiscordPrompt extracts message text correctly", () => {
  const message = createMockMessage({
    content: "Hello bot",
    authorName: "Alice",
    authorId: "user-456",
    isDirectMessage: true,
    sourceLabel: "DM",
  });

  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/Discord DM from Alice \(user-456\)/.test(prompt), true);
  assert.equal(/Hello bot/.test(prompt), true);
});

test("buildDiscordPrompt strips bot mention", () => {
  const message = createMockMessage({
    content: "<@bot-123> help me",
    authorName: "Bob",
  });

  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/help me/.test(prompt), true);
  assert.equal(prompt.includes("<@bot-123>"), false);
});

test("buildDiscordPrompt strips bot mention with exclamation", () => {
  const message = createMockMessage({
    content: "<@!bot-123> help me",
    authorName: "Bob",
  });

  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/help me/.test(prompt), true);
  assert.equal(prompt.includes("<@!bot-123>"), false);
});

test("buildDiscordPrompt handles multiple mentions", () => {
  const message = createMockMessage({
    content: "<@bot-123> <@user-456> check this",
    authorName: "Charlie",
  });

  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/<@user-456>/.test(prompt), true);
  assert.equal(prompt.includes("<@bot-123>"), false);
});

test("buildDiscordPrompt handles empty message content", () => {
  const message = createMockMessage({
    content: "",
    authorName: "Dave",
  });

  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/\(empty message\)/.test(prompt), true);
});

test("buildDiscordPrompt includes source label for guild messages", () => {
  const message = createMockMessage({
    content: "Hello",
    authorName: "Eve",
    isDirectMessage: false,
    sourceLabel: "#announcements",
  });

  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/Discord #announcements from Eve/.test(prompt), true);
});

test("shouldHandleDiscordMessage returns false for bot messages", () => {
  const message = createMockMessage({ isBot: true });

  const shouldHandle = shouldHandleDiscordMessage(message, "bot-123");

  assert.equal(shouldHandle, false);
});

test("shouldHandleDiscordMessage returns true for DMs", () => {
  const message = createMockMessage({
    isDirectMessage: true,
    isBot: false,
  });

  const shouldHandle = shouldHandleDiscordMessage(message, "bot-123");

  assert.equal(shouldHandle, true);
});

test("shouldHandleDiscordMessage returns true for mentions", () => {
  const message = createMockMessage({
    isDirectMessage: false,
    isBot: false,
    isMentioned: () => true,
  });

  const shouldHandle = shouldHandleDiscordMessage(message, "bot-123");

  assert.equal(shouldHandle, true);
});

test("shouldHandleDiscordMessage returns false for non-DM non-mention messages", () => {
  const message = createMockMessage({
    isDirectMessage: false,
    isBot: false,
    isMentioned: () => false,
  });

  const shouldHandle = shouldHandleDiscordMessage(message, "bot-123");

  assert.equal(shouldHandle, false);
});

test("buildDiscordPrompt normalizes whitespace after stripping mentions", () => {
  const message = createMockMessage({
    content: "<@bot-123>   multiple    spaces   here",
    authorName: "Frank",
  });

  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/multiple spaces here/.test(prompt), true);
  assert.equal(prompt.includes("    "), false);
});

test("extractDiscordPrompt returns message content", () => {
  const message = createMockMessage({ content: "hello discord", isDirectMessage: true });
  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/Discord DM from TestUser \(user-123\)/.test(prompt), true);
  assert.equal(/hello discord/.test(prompt), true);
});

test("extractDiscordPrompt strips bot mention", () => {
  const message = createMockMessage({ content: "<@bot-123> hello again" });
  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/hello again/.test(prompt), true);
  assert.equal(prompt.includes("<@bot-123>"), false);
});

test("extractDiscordPrompt with empty content returns empty message marker", () => {
  const message = createMockMessage({ content: "   " });
  const prompt = buildDiscordPrompt(message, "bot-123");

  assert.equal(/\(empty message\)/.test(prompt), true);
});
