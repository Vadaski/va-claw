export type MemoryMetadata = Record<string, unknown> | null;

export type MemoryEntry = {
  id: string;
  key: string;
  essence: string;
  details?: string;
  tags: string[];
  triggerConditions: string[];
  importance: number;
  strength: number;
  decayTau: number;
  lastAccessedAt?: string;
  accessCount: number;
  updatedAt: string;
  text: string;
  metadata: MemoryMetadata;
  createdAt: string;
};

export type MemoryStoreOptions = {
  dbPath?: string;
  enableVectorSearch?: boolean;
  vectorExtensionPath?: string;
};

export type StoredMemoryRow = {
  id: string;
  key: string | null;
  essence: string;
  details: string | null;
  tags: string | null;
  trigger_conditions: string | null;
  importance: number;
  strength: number;
  decay_tau: number;
  last_accessed_at: string | null;
  access_count: number;
  updated_at: string;
  text: string;
  metadata: string | null;
  created_at: string;
  search_text: string;
  embedding: string | null;
};
