import type { Env } from "../types";

export interface EmbeddingResult {
  vector: number[];
  tokens: number;
}

/**
 * Generate an embedding for a piece of text using Workers AI.
 * Returns the unit-normalized vector plus an approximate token count
 * (used for usage accounting).
 */
export async function embed(env: Env, text: string): Promise<EmbeddingResult> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 4000);
  const res = (await env.AI.run(env.EMBEDDING_MODEL as keyof AiModels, {
    text: [clean],
  })) as { data: number[][] };

  const vector = res?.data?.[0];
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("embedding model returned no vector");
  }
  return { vector: normalize(vector), tokens: approxTokens(clean) };
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
