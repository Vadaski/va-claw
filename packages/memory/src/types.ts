export type MemoryMetadata = Record<string, unknown> | null;

export type MemoryEntry = {
  id: string;
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
  text: string;
  metadata: string | null;
  created_at: string;
  search_text: string;
  embedding: string | null;
};
