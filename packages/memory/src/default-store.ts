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
