import { homedir } from "node:os";
import { join } from "node:path";
import { MemoryStore } from "./memory-store.js";
import type { MemoryEntry, MemoryMetadata, MemoryStoreOptions } from "./types.js";

let defaultStore: MemoryStore | null = null;

export function createMemoryStore(options: MemoryStoreOptions = {}): MemoryStore {
  return new MemoryStore({
    dbPath: options.dbPath ?? join(homedir(), ".va-claw", "memory.db"),
    enableVectorSearch: options.enableVectorSearch,
    vectorExtensionPath: options.vectorExtensionPath,
  });
}

export async function store(text: string, metadata?: MemoryMetadata): Promise<string> {
  return getDefaultStore().store(text, metadata ?? null);
}

export async function memorize(key: string, essence: string, options?: Parameters<MemoryStore["memorize"]>[2]): Promise<MemoryEntry> {
  return getDefaultStore().memorize(key, essence, options);
}

export async function get(key: string): Promise<MemoryEntry | undefined> {
  return getDefaultStore().get(key);
}

export async function update(key: string, changes: Parameters<MemoryStore["update"]>[1]): Promise<MemoryEntry | undefined> {
  return getDefaultStore().update(key, changes);
}

export async function forget(key: string): Promise<boolean> {
  return getDefaultStore().forget(key);
}

export async function recall(query: string, limit = 5): Promise<MemoryEntry[]> {
  return getDefaultStore().recall(query, limit);
}

export async function consolidate(): Promise<{
  forgotten: number;
  strengthened: number;
  total: number;
  potentialDuplicates: [string, string][];
}> {
  return getDefaultStore().consolidate();
}

export async function reflect(): Promise<string> {
  return getDefaultStore().reflect();
}

export async function count(): Promise<number> {
  return getDefaultStore().count();
}

export async function search(query: string, topK?: number): Promise<MemoryEntry[]> {
  return getDefaultStore().search(query, topK);
}

export async function list(limit?: number): Promise<MemoryEntry[]> {
  return getDefaultStore().list(limit);
}

export async function clear(): Promise<void> {
  return getDefaultStore().clear();
}

function getDefaultStore(): MemoryStore {
  defaultStore ??= createMemoryStore();
  return defaultStore;
}
