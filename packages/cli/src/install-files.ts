import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { MarkerPair } from "./types.js";

export const CLAUDE_MARKERS: MarkerPair = {
  start: "<!-- va-claw:identity:start -->",
  end: "<!-- va-claw:identity:end -->",
};

export const CODEX_MARKERS: MarkerPair = {
  start: "<!-- va-claw:codex:start -->",
  end: "<!-- va-claw:codex:end -->",
};

export function resolveClaudeMdPath(home = homedir()): string {
  return join(home, ".claude", "CLAUDE.md");
}

export function resolveCodexInstructionsPath(home = homedir()): string {
  return join(home, ".codex", "instructions.md");
}

export function resolveMemoryDbPath(home = homedir()): string {
  return join(home, ".va-claw", "memory.db");
}

export function resolveClawRegistryPath(home = homedir()): string {
  return join(home, ".va-claw", "claws.json");
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function upsertManagedBlock(
  path: string,
  block: string,
  markers: MarkerPair,
): Promise<void> {
  const current = (await readOptionalFile(path)).trim();
  const next = appendManagedBlock(current, block, markers);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next, "utf8");
}

export async function removeManagedBlock(path: string, markers: MarkerPair): Promise<void> {
  const current = await readOptionalFile(path);
  if (current === "") {
    return;
  }
  const next = stripManagedBlock(current, markers).trim();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next === "" ? "" : `${next}\n`, "utf8");
}

export function wrapCodexPrompt(prompt: string): string {
  return [CODEX_MARKERS.start, prompt.trim(), CODEX_MARKERS.end].join("\n");
}

function appendManagedBlock(source: string, block: string, markers: MarkerPair): string {
  const stripped = stripManagedBlock(source, markers).trim();
  const suffix = block.trim();
  return stripped === "" ? `${suffix}\n` : `${stripped}\n\n${suffix}\n`;
}

function stripManagedBlock(source: string, markers: MarkerPair): string {
  const escaped = [markers.start, markers.end].map(escapeRegExp);
  const pattern = new RegExp(`\\s*${escaped[0]}[\\s\\S]*?${escaped[1]}\\s*`, "g");
  return source.replace(pattern, "\n");
}

async function readOptionalFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
