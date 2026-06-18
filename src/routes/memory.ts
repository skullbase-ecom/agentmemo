import { Hono } from "hono";
import type { Env, Variables, MemoryRow } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { memoryId } from "../lib/ids";
import { embed, cosineSimilarity, approxTokens } from "../lib/embeddings";
import { requireScope } from "../middleware/auth";

const memory = new Hono<{ Bindings: Env; Variables: Variables }>();

interface StoreBody {
  user_id?: unknown;
  agent_id?: unknown;
  content?: unknown;
  metadata?: unknown;
  importance?: unknown;
  ttl_seconds?: unknown;
  tags?: unknown;
}

/** POST /memory/store — persist a memory and its embedding. */
memory.post("/store", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as StoreBody;

  const userId = requireString(body.user_id, "user_id", 256);
  const agentId = requireString(body.agent_id, "agent_id", 256);
  const content = requireString(body.content, "content", 100_000);

  let metadata = "{}";
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== "object" || Array.isArray(body.metadata)) {
      fail(400, "'metadata' must be a JSON object");
    }
    metadata = JSON.stringify(body.metadata);
  }

  // Semantic-memory enhancements: importance (0..10), TTL, tags.
  let importance = 0;
  if (body.importance !== undefined) {
    const n = Number(body.importance);
    if (!Number.isFinite(n) || n < 0 || n > 10) fail(400, "'importance' must be a number 0..10");
    importance = Math.round(n);
  }
  let expiresAt: number | null = null;
  if (body.ttl_seconds !== undefined) {
    const n = Number(body.ttl_seconds);
    if (!Number.isFinite(n) || n <= 0) fail(400, "'ttl_seconds' must be a positive number");
    expiresAt = Date.now() + Math.round(n) * 1000;
  }
  let tags: string | null = null;
  if (body.tags !== undefined && body.tags !== null) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== "string")) {
      fail(400, "'tags' must be an array of strings");
    }
    tags = (body.tags as string[]).map((t) => t.trim()).filter(Boolean).join(",") || null;
  }

  const key = c.get("apiKey");
  const now = Date.now();
  const id = memoryId();

  // Generate embedding; degrade gracefully if Workers AI is unavailable so a
  // store still succeeds (the memory just won't rank semantically until re-indexed).
  let embedding: string | null = null;
  let tokens = approxTokens(content);
  try {
    const result = await embed(c.env, content);
    embedding = JSON.stringify(result.vector);
    tokens = result.tokens;
  } catch (err) {
    console.error("embedding failed on store", String(err));
  }

  await c.env.DB.prepare(
    `INSERT INTO memories (id, api_key_id, user_id, agent_id, content, metadata, embedding, importance, expires_at, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, key.id, userId, agentId, content, metadata, embedding, importance, expiresAt, tags, now, now)
    .run();

  // Invalidate cached retrieval results for this scope.
  await invalidateRetrieveCache(c.env, key.id, userId, agentId);

  c.header("x-am-tokens", String(tokens));
  return c.json(
    {
      id,
      user_id: userId,
      agent_id: agentId,
      content,
      metadata: JSON.parse(metadata),
      importance,
      tags: tags ? tags.split(",") : [],
      expires_at: expiresAt,
      embedded: embedding !== null,
      created_at: now,
    },
    201,
  );
});

/** GET /memory/retrieve — semantic search over a user/agent's memories. */
memory.get("/retrieve", requireScope("read"), async (c) => {
  const query = requireString(c.req.query("q"), "q", 4000);
  const userId = requireString(c.req.query("user_id"), "user_id", 256);
  const agentId = c.req.query("agent_id"); // optional scope narrowing
  const limit = parseLimit(c.req.query("limit"), 10, 100);
  const minScore = Number.parseFloat(c.req.query("min_score") ?? "0") || 0;

  const key = c.get("apiKey");
  const candidateLimit = Math.max(
    50,
    Number.parseInt(c.env.RETRIEVE_CANDIDATE_LIMIT, 10) || 500,
  );

  // Cache key derived from the full query shape, namespaced by a per-scope
  // version that store/forget bumps — so writes immediately invalidate reads.
  const version = await scopeVersion(c.env, key.id, userId);
  const cacheKey = `retrieve:${key.id}:${userId}:${agentId ?? "*"}:${version}:${limit}:${minScore}:${query}`;
  const cached = await c.env.CACHE.get(cacheKey, "json");
  if (cached) {
    c.header("x-am-cache", "HIT");
    return c.json(cached as object);
  }

  // Embed the query.
  let queryVec: number[] | null = null;
  let tokens = approxTokens(query);
  try {
    const result = await embed(c.env, query);
    queryVec = result.vector;
    tokens = result.tokens;
  } catch (err) {
    console.error("embedding failed on retrieve", String(err));
  }

  // Pull candidate rows for the scope, skipping expired (TTL) memories.
  const nowTs = Date.now();
  const where = agentId
    ? `api_key_id = ? AND user_id = ? AND agent_id = ? AND (expires_at IS NULL OR expires_at > ?)`
    : `api_key_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > ?)`;
  const binds = agentId ? [key.id, userId, agentId, nowTs] : [key.id, userId, nowTs];

  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, agent_id, content, metadata, embedding, importance, tags, created_at, updated_at
     FROM memories WHERE ${where}
     ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(...binds, candidateLimit)
    .all<MemoryRow>();

  // Rank by cosine similarity when we have a query embedding; otherwise fall
  // back to recency (already ordered by created_at DESC).
  const ranked = (results ?? [])
    .map((row) => {
      let score = 0;
      if (queryVec && row.embedding) {
        try {
          score = cosineSimilarity(queryVec, JSON.parse(row.embedding) as number[]);
        } catch {
          score = 0;
        }
      }
      return { row, score };
    })
    .filter((r) => (queryVec ? r.score >= minScore : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) => ({
      id: row.id,
      user_id: row.user_id,
      agent_id: row.agent_id,
      content: row.content,
      metadata: safeJson(row.metadata),
      importance: row.importance ?? 0,
      tags: row.tags ? row.tags.split(",") : [],
      score: queryVec ? Number(score.toFixed(6)) : null,
      created_at: row.created_at,
    }));

  const payload = {
    query,
    user_id: userId,
    agent_id: agentId ?? null,
    semantic: queryVec !== null,
    count: ranked.length,
    results: ranked,
  };

  const ttl = Math.max(30, Number.parseInt(c.env.RETRIEVE_CACHE_TTL, 10) || 300);
  await c.env.CACHE.put(cacheKey, JSON.stringify(payload), { expirationTtl: ttl });

  c.header("x-am-cache", "MISS");
  c.header("x-am-tokens", String(tokens));
  return c.json(payload);
});

/** DELETE /memory/forget — delete a specific memory (by id) or a whole scope. */
memory.delete("/forget", requireScope("write"), async (c) => {
  const id = c.req.query("id");
  const userId = c.req.query("user_id");
  const agentId = c.req.query("agent_id");
  const key = c.get("apiKey");

  if (!id && !userId) {
    fail(400, "provide either 'id' or 'user_id' (optionally with 'agent_id') to forget");
  }

  let result: D1Result;
  if (id) {
    // Always scope deletes to the calling key to prevent cross-tenant deletion.
    result = await c.env.DB.prepare(`DELETE FROM memories WHERE id = ? AND api_key_id = ?`)
      .bind(id, key.id)
      .run();
  } else if (agentId) {
    result = await c.env.DB.prepare(
      `DELETE FROM memories WHERE api_key_id = ? AND user_id = ? AND agent_id = ?`,
    )
      .bind(key.id, userId, agentId)
      .run();
  } else {
    result = await c.env.DB.prepare(`DELETE FROM memories WHERE api_key_id = ? AND user_id = ?`)
      .bind(key.id, userId)
      .run();
  }

  const deleted = result.meta?.changes ?? 0;
  if (id && deleted === 0) fail(404, "memory not found");

  if (userId) await invalidateRetrieveCache(c.env, key.id, userId, agentId ?? null);

  return c.json({ deleted });
});

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/**
 * Read the current cache version for a (key, user) scope. Retrieval cache keys
 * embed this value, so bumping it on write makes every prior cached entry for
 * the scope unreachable without needing KV prefix deletion.
 */
async function scopeVersion(env: Env, keyId: string, userId: string): Promise<string> {
  return (await env.CACHE.get(`ver:${keyId}:${userId}`)) ?? "0";
}

/** Bump a scope's cache version, invalidating its cached retrievals. */
async function invalidateRetrieveCache(
  env: Env,
  keyId: string,
  userId: string,
  _agentId: string | null,
): Promise<void> {
  await env.CACHE.put(`ver:${keyId}:${userId}`, String(Date.now())).catch(() => {});
}

export default memory;
