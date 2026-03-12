import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  loadIdentity,
  saveIdentity,
  toClaudeMdSnippet,
  toCodexSystemPrompt,
} from "../dist/index.js";

test("saveIdentity and loadIdentity round-trip config", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-identity-"));
  const configPath = join(dir, "config.json");
  const config = {
    name: "Nova",
    persona: "Precise and calm.",
    systemPrompt: "Stay grounded in the saved identity.",
    wakePrompt: "Load memory first.",
    loopInterval: "*/15 * * * *",
  };

  await saveIdentity(config, configPath);
  const loaded = await loadIdentity(configPath);
  await rm(dir, { recursive: true, force: true });

  // Core fields must round-trip; channels defaults are normalised in by loadIdentity
  assert.equal(loaded.name, config.name);
  assert.equal(loaded.persona, config.persona);
  assert.equal(loaded.systemPrompt, config.systemPrompt);
  assert.equal(loaded.wakePrompt, config.wakePrompt);
  assert.equal(loaded.loopInterval, config.loopInterval);
});

test("loadIdentity returns defaults when file is missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-identity-"));
  const configPath = join(dir, "missing.json");

  const loaded = await loadIdentity(configPath);
  await rm(dir, { recursive: true, force: true });

  assert.equal(loaded.loopInterval, "0 * * * *");
  assert.equal(typeof loaded.name, "string");
});

test("toClaudeMdSnippet includes name and systemPrompt", () => {
  const snippet = toClaudeMdSnippet({
    name: "Nova",
    persona: "Precise and calm.",
    systemPrompt: "Act with continuity.",
    wakePrompt: "Load memory first.",
    loopInterval: "0 * * * *",
  });

  assert.match(snippet, /Nova/);
  assert.match(snippet, /Act with continuity\./);
});

test("toCodexSystemPrompt returns a non-empty prompt", () => {
  const prompt = toCodexSystemPrompt({
    name: "Nova",
    persona: "Precise and calm.",
    systemPrompt: "Act with continuity.",
    wakePrompt: "Load memory first.",
    loopInterval: "0 * * * *",
  });

  assert.ok(prompt.trim().length > 0);
});
