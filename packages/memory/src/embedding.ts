import { homedir } from "node:os";
import { join } from "node:path";
import type { MemoryMetadata } from "./types.js";

declare const process: {
  env: Record<string, string | undefined>;
};

const EMBEDDING_DIMENSIONS = 384;
const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const EMBEDDING_CACHE_DIR = join(homedir(), ".va-claw", "models");

type EmbeddingTensor = {
  data: ArrayLike<number>;
};

type EmbeddingExtractor = (
  input: string,
  options: { pooling: "mean"; normalize: true },
) => Promise<EmbeddingTensor>;

let embeddingExtractorPromise: Promise<EmbeddingExtractor> | undefined;
let embeddingExtractorOverride: EmbeddingExtractor | undefined;

export function buildSearchText(text: string, metadata: MemoryMetadata): string {
  const metadataText = metadata ? flattenMetadata(metadata).join(" ") : "";
  return `${text} ${metadataText}`.trim().toLowerCase();
}

export async function createEmbedding(input: string): Promise<number[]> {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  }

  const extractor = await getEmbeddingExtractor();
  const tensor = await extractor(normalizedInput, { pooling: "mean", normalize: true });
  const vector = Array.from(tensor.data);
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-dim embedding from ${EMBEDDING_MODEL}, received ${vector.length}.`,
    );
  }
  return vector;
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

async function getEmbeddingExtractor(): Promise<EmbeddingExtractor> {
  if (embeddingExtractorOverride) {
    return embeddingExtractorOverride;
  }
  if (!embeddingExtractorPromise) {
    embeddingExtractorPromise = loadEmbeddingExtractor().catch((error: unknown) => {
      embeddingExtractorPromise = undefined;
      throw error;
    });
  }
  return embeddingExtractorPromise;
}

async function loadEmbeddingExtractor(): Promise<EmbeddingExtractor> {
  const transformers = await import("@huggingface/transformers");
  process.env.HF_HOME ??= EMBEDDING_CACHE_DIR;
  process.env.TRANSFORMERS_CACHE ??= EMBEDDING_CACHE_DIR;
  transformers.env.cacheDir = EMBEDDING_CACHE_DIR;

  const extractor = await transformers.pipeline("feature-extraction", EMBEDDING_MODEL);
  return extractor as EmbeddingExtractor;
}

export function __setEmbeddingExtractorForTests(extractor?: EmbeddingExtractor): void {
  embeddingExtractorOverride = extractor;
  embeddingExtractorPromise = undefined;
}

export function __resetEmbeddingModelForTests(): void {
  embeddingExtractorOverride = undefined;
  embeddingExtractorPromise = undefined;
}
