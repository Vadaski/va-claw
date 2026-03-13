import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type ClawStatus = "running" | "working" | "idle" | "waiting" | "error" | "offline" | "stopped";

export type ClawDefinition = {
  name: string;
  goal: string;
  status: ClawStatus;
  cliCommand: string;
  note: string;
  tags: string[];
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClawCreateInput = {
  name: string;
  goal?: string;
  status?: ClawStatus;
  cliCommand?: string;
  note?: string;
  tags?: string[];
};

export type ClawUpdateInput = {
  goal?: string;
  status?: ClawStatus;
  cliCommand?: string;
  note?: string;
  tags?: string[];
  seen?: boolean;
};

type ClawRegistry = {
  version: number;
  claws: ClawDefinition[];
};

type NowFn = () => Date;

const DEFAULT_CLAW_STATUS: ClawStatus = "idle";
const KNOWN_STATUSES: ReadonlySet<string> = new Set(["running", "working", "idle", "waiting", "error", "offline", "stopped"]);
const REGISTRY_VERSION = 1;

const DEFAULT_NOW: NowFn = () => new Date();

export function isClawStatus(value: string | undefined): value is ClawStatus {
  return KNOWN_STATUSES.has(value ?? "");
}

function pickString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function pickTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function normalizeStatus(value: unknown): ClawStatus {
  return isClawStatus(typeof value === "string" ? value : undefined) ? (value as ClawStatus) : DEFAULT_CLAW_STATUS;
}

export function validateClawStatus(value: unknown): ClawStatus | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return isClawStatus(normalized) ? normalized : null;
}

function normalizeClawDefinition(raw: unknown): ClawDefinition | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const name = pickString(Reflect.get(raw, "name"));
  if (name === "") {
    return null;
  }
  const createdAt = pickString(Reflect.get(raw, "createdAt"), new Date(0).toISOString());
  const updatedAt = pickString(Reflect.get(raw, "updatedAt"), createdAt);
  return {
    name,
    goal: pickString(Reflect.get(raw, "goal")),
    status: normalizeStatus(Reflect.get(raw, "status")),
    cliCommand: pickString(Reflect.get(raw, "cliCommand"), "va-claw"),
    note: pickString(Reflect.get(raw, "note")),
    tags: pickTags(Reflect.get(raw, "tags")),
    lastSeenAt: pickString(Reflect.get(raw, "lastSeenAt"), "").trim() || undefined,
    createdAt,
    updatedAt,
  };
}

function normalizeClawRegistry(raw: unknown): ClawRegistry {
  if (!raw || typeof raw !== "object") {
    return { version: REGISTRY_VERSION, claws: [] };
  }
  const version = typeof Reflect.get(raw, "version") === "number" ? Reflect.get(raw, "version") : REGISTRY_VERSION;
  const rawClaws = Reflect.get(raw, "claws");
  const claws = Array.isArray(rawClaws) ? rawClaws.map(normalizeClawDefinition).filter(Boolean) as ClawDefinition[] : [];
  return { version: Number(version) > 0 ? Number(version) : REGISTRY_VERSION, claws };
}

export async function listClaws(registryPath: string): Promise<ClawDefinition[]> {
  const registry = await loadClawRegistry(registryPath);
  return [...registry.claws];
}

export async function getClaw(registryPath: string, name: string): Promise<ClawDefinition | undefined> {
  const registry = await loadClawRegistry(registryPath);
  return registry.claws.find((entry) => entry.name === name);
}

export async function registerClaw(registryPath: string, input: ClawCreateInput, now: NowFn = DEFAULT_NOW): Promise<ClawDefinition> {
  const registry = await loadClawRegistry(registryPath);
  const exists = registry.claws.some((entry) => entry.name === input.name);
  if (exists) {
    throw new Error(`Claw already exists: ${input.name}`);
  }

  const timestamp = now().toISOString();
  const claw: ClawDefinition = {
    name: input.name,
    goal: pickString(input.goal),
    status: input.status ?? DEFAULT_CLAW_STATUS,
    cliCommand: pickString(input.cliCommand, "va-claw"),
    note: pickString(input.note),
    tags: Array.isArray(input.tags) ? input.tags.filter((tag) => tag.trim() !== "") : [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  registry.claws = [claw, ...registry.claws];
  await saveClawRegistry(registryPath, registry);
  return claw;
}

export async function updateClaw(registryPath: string, name: string, updates: ClawUpdateInput, now: NowFn = DEFAULT_NOW): Promise<ClawDefinition | null> {
  const registry = await loadClawRegistry(registryPath);
  const index = registry.claws.findIndex((entry) => entry.name === name);
  if (index < 0) {
    return null;
  }
  const nowIso = now().toISOString();
  const current = registry.claws[index];
  const next: ClawDefinition = {
    ...current,
    goal: updates.goal ?? current.goal,
    status: updates.status ?? current.status,
    cliCommand: updates.cliCommand ?? current.cliCommand,
    note: updates.note ?? current.note,
    tags: Array.isArray(updates.tags) ? updates.tags.filter((tag) => tag.trim() !== "") : current.tags,
    lastSeenAt: updates.seen ? nowIso : current.lastSeenAt,
    updatedAt: nowIso,
  };
  registry.claws[index] = next;
  await saveClawRegistry(registryPath, registry);
  return next;
}

export async function removeClaw(registryPath: string, name: string): Promise<boolean> {
  const registry = await loadClawRegistry(registryPath);
  const before = registry.claws.length;
  registry.claws = registry.claws.filter((entry) => entry.name !== name);
  if (registry.claws.length === before) {
    return false;
  }
  await saveClawRegistry(registryPath, registry);
  return true;
}

async function loadClawRegistry(registryPath: string): Promise<ClawRegistry> {
  try {
    const rawText = await readFile(registryPath, "utf8");
    return normalizeClawRegistry(JSON.parse(rawText));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return { version: REGISTRY_VERSION, claws: [] };
    }
    throw error;
  }
}

async function saveClawRegistry(registryPath: string, registry: ClawRegistry): Promise<void> {
  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `${JSON.stringify({ ...registry, version: REGISTRY_VERSION }, null, 2)}\n`, "utf8");
}
