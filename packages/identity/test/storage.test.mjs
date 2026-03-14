import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  loadIdentity,
  saveIdentity,
  toClaudeMdSnippet,
  toCodexSystemPrompt,
} from "../dist/index.js";

const FULL_IDENTITY = {
  name: "Nova",
  persona: "Precise and calm.",
  systemPrompt: "Act with continuity.",
  wakePrompt: "Load memory first.",
  loopInterval: "*/15 * * * *",
  channels: {
    discord: {
      token: "discord-token",
      clientId: "discord-client-id",
      cliCommand: "claude",
      autoStart: true,
    },
    telegram: {
      token: "telegram-token",
      cliCommand: "va-claw",
    },
    slack: {
      botToken: "slack-bot-token",
      appToken: "slack-app-token",
      cliCommand: "codex",
    },
    lark: {
      appId: "cli_a123",
      appSecret: "secret_456",
      cliCommand: "claude -p",
      notifyChatId: "oc_789",
    },
  },
};

test("saveIdentity writes JSON containing all fields", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-identity-"));
  const configPath = join(dir, "identity.json");

  await saveIdentity(FULL_IDENTITY, configPath);
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw);

  assert.equal(parsed.name, FULL_IDENTITY.name);
  assert.equal(parsed.persona, FULL_IDENTITY.persona);
  assert.equal(parsed.systemPrompt, FULL_IDENTITY.systemPrompt);
  assert.equal(parsed.wakePrompt, FULL_IDENTITY.wakePrompt);
  assert.equal(parsed.loopInterval, FULL_IDENTITY.loopInterval);
  assert.equal(parsed.channels.discord.token, FULL_IDENTITY.channels.discord.token);
  assert.equal(parsed.channels.discord.clientId, FULL_IDENTITY.channels.discord.clientId);
  assert.equal(parsed.channels.discord.cliCommand, FULL_IDENTITY.channels.discord.cliCommand);
  assert.equal(parsed.channels.discord.autoStart, FULL_IDENTITY.channels.discord.autoStart);
  assert.equal(parsed.channels.telegram.token, FULL_IDENTITY.channels.telegram.token);
  assert.equal(parsed.channels.telegram.cliCommand, FULL_IDENTITY.channels.telegram.cliCommand);
  assert.equal(parsed.channels.slack.botToken, FULL_IDENTITY.channels.slack.botToken);
  assert.equal(parsed.channels.slack.appToken, FULL_IDENTITY.channels.slack.appToken);
  assert.equal(parsed.channels.slack.cliCommand, FULL_IDENTITY.channels.slack.cliCommand);
  assert.equal(parsed.channels.lark.appId, FULL_IDENTITY.channels.lark.appId);
  assert.equal(parsed.channels.lark.appSecret, FULL_IDENTITY.channels.lark.appSecret);
  assert.equal(parsed.channels.lark.cliCommand, FULL_IDENTITY.channels.lark.cliCommand);
  assert.equal(parsed.channels.lark.notifyChatId, FULL_IDENTITY.channels.lark.notifyChatId);

  await rm(dir, { recursive: true, force: true });
});

test("loadIdentity throws SyntaxError for corrupted JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-identity-"));
  const configPath = join(dir, "corrupted.json");

  await writeFile(configPath, "{ this is not valid json ", "utf8");

  await assert.rejects(
    () => loadIdentity(configPath),
    (error) => error instanceof SyntaxError,
  );

  await rm(dir, { recursive: true, force: true });
});

test("toClaudeMdSnippet includes persona content", () => {
  const snippet = toClaudeMdSnippet(FULL_IDENTITY);

  assert.equal(/Persona:/.test(snippet), true);
  assert.equal(snippet.includes(FULL_IDENTITY.persona), true);
});

test("toCodexSystemPrompt includes persona field", () => {
  const prompt = toCodexSystemPrompt(FULL_IDENTITY);

  assert.equal(/Persona:/.test(prompt), true);
  assert.equal(prompt.includes(FULL_IDENTITY.persona), true);
});
