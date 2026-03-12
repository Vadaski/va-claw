import type { MemoryMetadata } from "./types.js";

const EMBEDDING_DIMENSIONS = 32;

export function buildSearchText(text: string, metadata: MemoryMetadata): string {
  const metadataText = metadata ? flattenMetadata(metadata).join(" ") : "";
  return `${text} ${metadataText}`.trim().toLowerCase();
}

export function createEmbedding(input: string): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  for (const token of tokenize(input)) {
    const hash = hashToken(token);
    const index = Math.abs(hash) % EMBEDDING_DIMENSIONS;
    vector[index] += hash < 0 ? -1 : 1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const size = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < size; index += 1) {
    score += left[index] * right[index];
  }
  return score;
}

export function keywordTokens(query: string): string[] {
  return Array.from(new Set(tokenize(query)));
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/[^a-z0-9\u4e00-\u9fff]+/).filter(Boolean);
}

function flattenMetadata(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenMetadata(item));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => [
      key,
      ...flattenMetadata(item),
    ]);
  }
  return [];
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}
