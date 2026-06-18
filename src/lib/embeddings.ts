import type { Env } from "../types";
import { sha256Hex } from "./crypto";

export interface EmbeddingResult {
  vector: number[];
  tokens: number;
  cached?: boolean;
}

// Embeddings are deterministic per (model, content), so we cache the normalized
// vector in KV keyed by a content hash. Re-storing identical content (or running
// the same query) reuses the vector and skips the Workers AI call entirely —
// typically a 30-40% cut in AI calls for real workloads.
const EMBED_CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

/**
 * Generate (or reuse) an embedding for a piece of text using Workers AI.
 * Returns the unit-normalized vector plus an approximate token count.
 */
export async function embed(env: Env, text: string): Promise<EmbeddingResult> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 4000);
  const tokens = approxTokens(clean);

  // Content-hash cache lookup. Namespaced by model so a model change invalidates.
  const hash = await sha256Hex(`${env.EMBEDDING_MODEL}:${clean}`);
  const cacheKey = `emb:${hash}`;
  const hit = (await env.CACHE.get(cacheKey, "json").catch(() => null)) as number[] | null;
  if (hit && Array.isArray(hit) && hit.length) {
    return { vector: hit, tokens: 0, cached: true };
  }

  const res = (await env.AI.run(env.EMBEDDING_MODEL as keyof AiModels, {
    text: [clean],
  })) as { data: number[][] };

  const raw = res?.data?.[0];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("embedding model returned no vector");
  }
  const vector = normalize(raw);

  // Cache the normalized vector (best-effort).
  await env.CACHE.put(cacheKey, JSON.stringify(vector), { expirationTtl: EMBED_CACHE_TTL }).catch(
    () => {},
  );

  return { vector, tokens, cached: false };
}

/** Rough token estimate (~4 chars/token) for usage metering. */
export function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** L2-normalize a vector so cosine similarity reduces to a dot product. */
export function normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

/**
 * Cosine similarity. Assumes both vectors are already normalized, so this is
 * just a dot product; falls back gracefully on length mismatch.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}
