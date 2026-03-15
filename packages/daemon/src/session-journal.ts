import { appendFile, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type SessionRole = "user" | "assistant";

export type SessionJournalEntry = {
  timestamp: string;
  role: SessionRole;
  summary: string;
};

export type SessionContextOptions = {
  limit?: number;
  maxChars?: number;
};

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_CHARS = 2_000;
const MAX_SUMMARY_LENGTH = 200;

export function resolveSessionJournalPath(home = homedir()): string {
  return join(home, ".va-claw", "session-journal.jsonl");
}

export async function appendSessionJournalEntry(
  entry: {
    timestamp?: string;
    role: SessionRole;
    summary: string;
  },
  journalPath = resolveSessionJournalPath(),
): Promise<SessionJournalEntry> {
  const normalized: SessionJournalEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    role: entry.role,
    summary: normalizeSessionSummary(entry.summary),
  };
  await mkdir(dirname(journalPath), { recursive: true });
  await appendFile(journalPath, `${JSON.stringify(normalized)}\n`, "utf8");
  return normalized;
}

export async function readSessionJournalEntries(
  journalPath = resolveSessionJournalPath(),
): Promise<SessionJournalEntry[]> {
  let raw = "";
  try {
    raw = await readFile(journalPath, "utf8");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const entries: SessionJournalEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as Partial<SessionJournalEntry>;
      if (
        (parsed.role === "user" || parsed.role === "assistant")
        && typeof parsed.timestamp === "string"
        && typeof parsed.summary === "string"
      ) {
        entries.push({
          timestamp: parsed.timestamp,
          role: parsed.role,
          summary: normalizeSessionSummary(parsed.summary),
        });
      }
    } catch {
      continue;
    }
  }
  return entries;
}

export async function readRecentSessionContext(
  options: SessionContextOptions = {},
  journalPath = resolveSessionJournalPath(),
): Promise<SessionJournalEntry[]> {
  const limit = normalizePositiveInteger(options.limit, DEFAULT_LIMIT);
  const maxChars = normalizePositiveInteger(options.maxChars, DEFAULT_MAX_CHARS);
  const entries = await readSessionJournalEntries(journalPath);
  const recent = entries.slice(-limit);
  const bounded: SessionJournalEntry[] = [];
  let totalChars = 0;

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const entry = recent[index];
    if (!entry) {
      continue;
    }
    const formatted = formatSessionJournalEntry(entry);
    if (bounded.length > 0 && totalChars + formatted.length > maxChars) {
      break;
    }
    if (bounded.length === 0 && formatted.length > maxChars) {
      bounded.unshift({
        ...entry,
        summary: entry.summary.slice(0, Math.max(0, maxChars)),
      });
      break;
    }
    bounded.unshift(entry);
    totalChars += formatted.length;
  }

  return bounded;
}

export function formatSessionJournalEntry(entry: SessionJournalEntry): string {
  return `[${entry.timestamp}] ${entry.role}: ${entry.summary}`;
}

export function formatRecentSessionContext(entries: SessionJournalEntry[]): string {
  if (entries.length === 0) {
    return "";
  }
  return [
    "Recent session context:",
    ...entries.map((entry) => `- ${entry.timestamp} ${entry.role}: ${entry.summary}`),
    "",
  ].join("\n");
}

export function normalizeSessionSummary(summary: string): string {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (normalized === "") {
    throw new Error("Session summary cannot be empty.");
  }
  return normalized.slice(0, MAX_SUMMARY_LENGTH);
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}
