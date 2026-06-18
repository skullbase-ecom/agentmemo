import { Hono } from "hono";
import type { Env, Variables, MemoryRow } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { memoryId } from "../lib/ids";
import { sha256Hex } from "../lib/crypto";
import { embed, cosineSimilarity, approxTokens } from "../lib/embeddings";
import { requireScope } from "../middleware/auth";
import { classifyOne } from "../lib/classify";
import { getAgentTrust, recordWrite, audit } from "../lib/security";

const memory = new Hono<{ Bindings: Env; Variables: Variables }>();

interface StoreBody {
  user_id?: unknown;
  agent_id?: unknown;
  content?: unknown;
  metadata?: unknown;
  importance?: unknown;
  ttl_seconds?: unknown;
  tags?: unknown;
  detect_conflicts?: unknown;
  namespace?: unknown;
  outcome?: unknown;
  valid_from?: unknown;
  valid_until?: unknown;
}

const NEGATION = /\b(not|never|no longer|isn't|doesn't|don't|won't|can't|cancel(?:led|ed)?|stopped|quit)\b/i;
const ANTONYMS: [string, string][] = [
  ["vegetarian", "chicken"], ["vegetarian", "beef"], ["vegetarian", "meat"],
  ["vegan", "meat"], ["vegan", "cheese"], ["likes", "hates"], ["loves", "hates"],
  ["active", "cancel"], ["subscribed", "unsubscrib"], ["enabled", "disabled"],
];

/** Fast heuristic contradiction check between two texts. */
function contradicts(a: string, b: string): boolean {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (NEGATION.test(la) !== NEGATION.test(lb)) return true;
  for (const [x, y] of ANTONYMS) {
    if ((la.includes(x) && lb.includes(y)) || (la.includes(y) && lb.includes(x))) return true;
  }
  return false;
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

  const namespace = body.namespace == null ? "default" : requireString(body.namespace, "namespace", 128);
  let outcome = "unknown";
  if (body.outcome !== undefined) {
    outcome = String(body.outcome);
    if (!["success", "failure", "unknown"].includes(outcome)) {
      fail(400, "'outcome' must be success, failure, or unknown");
    }
  }
  const validFrom = body.valid_from == null ? null : Number(body.valid_from) || null;
  const validUntil = body.valid_until == null ? null : Number(body.valid_until) || null;

  const key = c.get("apiKey");
  const now = Date.now();
  const id = memoryId();

  // OWASP ASI06 — block writes from low-trust keys.
  const trust = await getAgentTrust(c.env, key.id);
  if (trust.blocked || trust.trust_score < 0.3) {
    return c.json(
      {
        error: "trust_score_too_low",
        code: "trust_score_too_low",
        docs: "https://agentmemo.dev/docs",
        trust_score: Number(trust.trust_score.toFixed(2)),
        reason: "suspicious write pattern detected",
      },
      403,
    );
  }

  // Content hash for integrity + dedup. Skip if an identical memory exists in scope.
  const contentHash = await sha256Hex(content);
  const dup = await c.env.DB.prepare(
    `SELECT id FROM memories WHERE api_key_id = ? AND content_hash = ? AND user_id = ? AND agent_id = ? LIMIT 1`,
  )
    .bind(key.id, contentHash, userId, agentId)
    .first<{ id: string }>();
  if (dup) {
    return c.json({ status: "duplicate", id: dup.id, deduplicated: true, content_hash: contentHash });
  }

  const category = classifyOne(content);
  const protocol = (c.req.header("x-mcp") ? "MCP" : "REST");

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
    `INSERT INTO memories (id, api_key_id, user_id, agent_id, content, metadata, embedding, importance,
       expires_at, tags, namespace, outcome, valid_from, valid_until, category, trust_score, content_hash,
       written_by, write_protocol, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id, key.id, userId, agentId, content, metadata, embedding, importance,
      expiresAt, tags, namespace, outcome, validFrom, validUntil, category, trust.trust_score, contentHash,
      key.id, protocol, now, now,
    )
    .run();

  // Audit + trust accounting (fire-and-forget).
  c.executionCtx.waitUntil(recordWrite(c.env, key.id, now));
  c.executionCtx.waitUntil(
    audit(c.env, { memory_id: id, action: "store", api_key_id: key.id, trust_score: trust.trust_score, outcome, now }),
  );

  // Invalidate cached retrieval results for this scope.
  await invalidateRetrieveCache(c.env, key.id, userId, agentId);

  // Optional contradiction detection against existing memories in scope.
  let conflict: object | null = null;
  if (body.detect_conflicts && embedding) {
    const qv = JSON.parse(embedding) as number[];
    const { results } = await c.env.DB.prepare(
      `SELECT id, content, embedding FROM memories
       WHERE api_key_id = ? AND user_id = ? AND agent_id = ? AND id != ?
         AND (expires_at IS NULL OR expires_at > ?) AND embedding IS NOT NULL
       ORDER BY created_at DESC LIMIT 200`,
    )
      .bind(key.id, userId, agentId, id, now)
      .all<{ id: string; content: string; embedding: string }>();

    let best: { id: string; content: string; score: number } | null = null;
    for (const row of results ?? []) {
      let score = 0;
      try {
        score = cosineSimilarity(qv, JSON.parse(row.embedding) as number[]);
      } catch {
        score = 0;
      }
      if (score > 0.45 && (!best || score > best.score) && contradicts(content, row.content)) {
        best = { id: row.id, content: row.content, score };
      }
    }
    if (best) {
      conflict = {
        existing_memory_id: best.id,
        existing_content: best.content,
        conflict_type: "contradiction",
        confidence: Number(best.score.toFixed(4)),
        resolution: "store kept both; link via POST /memory/graph/link or DELETE the stale one",
      };
      // Auto-link the contradiction in the graph.
      c.executionCtx.waitUntil(
        c.env.DB.prepare(
          `INSERT INTO memory_links (id, api_key_id, from_id, to_id, relationship, created_at)
           VALUES (?, ?, ?, ?, 'contradicts', ?)`,
        )
          .bind(`lnk_${id.slice(4)}`, key.id, id, best.id, now)
          .run()
          .catch(() => {}),
      );
    }
  }

  c.header("x-am-tokens", String(tokens));
  return c.json(
    {
      id,
      status: embedding ? "stored" : "queued",
      user_id: userId,
      agent_id: agentId,
      content,
      metadata: JSON.parse(metadata),
      namespace,
      importance,
      outcome,
      category,
      trust_score: Number(trust.trust_score.toFixed(2)),
      tags: tags ? tags.split(",") : [],
      expires_at: expiresAt,
      embedded: embedding !== null,
      contradiction: conflict,
      conflict,
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
  const namespace = c.req.query("namespace");
  const outcomeFilter = c.req.query("outcome");
  const minImportance = Number.parseInt(c.req.query("min_importance") ?? "", 10);
  const tagFilter = (c.req.query("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const includeExpired = c.req.query("include_expired") === "true";

  const key = c.get("apiKey");
  const candidateLimit = Math.max(
    50,
    Number.parseInt(c.env.RETRIEVE_CANDIDATE_LIMIT, 10) || 500,
  );

  // Cache key derived from the full query shape, namespaced by a per-scope
  // version that store/forget bumps — so writes immediately invalidate reads.
  const version = await scopeVersion(c.env, key.id, userId);
  const cacheKey = `retrieve:${key.id}:${userId}:${agentId ?? "*"}:${version}:${limit}:${minScore}:${namespace ?? ""}:${outcomeFilter ?? ""}:${minImportance || 0}:${tagFilter.join("+")}:${includeExpired}:${query}`;
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

  // Pull candidate rows for the scope with all filters applied in SQL.
  const nowTs = Date.now();
  const conds = ["api_key_id = ?", "user_id = ?"];
  const binds: unknown[] = [key.id, userId];
  if (agentId) { conds.push("agent_id = ?"); binds.push(agentId); }
  if (namespace) { conds.push("namespace = ?"); binds.push(namespace); }
  if (outcomeFilter) { conds.push("outcome = ?"); binds.push(outcomeFilter); }
  if (Number.isFinite(minImportance)) { conds.push("importance >= ?"); binds.push(minImportance); }
  if (!includeExpired) { conds.push("(expires_at IS NULL OR expires_at > ?)"); binds.push(nowTs); }
  // Temporal validity: only currently-valid facts.
  conds.push("(valid_from IS NULL OR valid_from <= ?)"); binds.push(nowTs);
  conds.push("(valid_until IS NULL OR valid_until > ?)"); binds.push(nowTs);

  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, agent_id, content, metadata, embedding, importance, tags,
            outcome_score, namespace, outcome, created_at, updated_at
     FROM memories WHERE ${conds.join(" AND ")}
     ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(...binds, candidateLimit)
    .all<MemoryRow>();

  // Composite scoring: semantic (0.5) + outcome (0.25) + importance (0.15) + recency (0.10).
  const ranked = (results ?? [])
    .filter((row) => (tagFilter.length ? tagFilter.some((t) => (row.tags ?? "").split(",").includes(t)) : true))
    .map((row) => {
      let semantic = 0;
      if (queryVec && row.embedding) {
        try { semantic = cosineSimilarity(queryVec, JSON.parse(row.embedding) as number[]); } catch { semantic = 0; }
      }
      const ageDays = Math.max(0, (nowTs - row.created_at) / 86_400_000);
      const recency = Math.exp(-ageDays / 30);
      const composite = queryVec
        ? semantic * 0.5 + (row.outcome_score ?? 0) * 0.25 + ((row.importance ?? 0) / 10) * 0.15 + recency * 0.1
        : recency;
      return { row, semantic, composite };
    })
    .filter((r) => (queryVec ? r.semantic >= minScore : true))
    .sort((a, b) => b.composite - a.composite)
    .slice(0, limit)
    .map(({ row, semantic, composite }) => ({
      id: row.id,
      user_id: row.user_id,
      agent_id: row.agent_id,
      content: row.content,
      metadata: safeJson(row.metadata),
      namespace: row.namespace ?? "default",
      importance: row.importance ?? 0,
      outcome: row.outcome ?? "unknown",
      tags: row.tags ? row.tags.split(",") : [],
      score: queryVec ? Number(semantic.toFixed(6)) : null,
      final_score: queryVec ? Number(composite.toFixed(6)) : null,
      created_at: row.created_at,
    }));

  // Track retrieval (count + last_retrieved_at) for returned hits.
  if (ranked.length) {
    const ids = ranked.map((r) => r.id);
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `UPDATE memories SET retrieval_count = retrieval_count + 1, last_retrieved_at = ?
         WHERE id IN (${ids.map(() => "?").join(",")})`,
      ).bind(nowTs, ...ids).run().catch(() => {}),
    );
  }

  const payload = {
    query,
    user_id: userId,
    agent_id: agentId ?? null,
    namespace: namespace ?? null,
    semantic: queryVec !== null,
    scoring: "composite (semantic 0.5 + outcome 0.25 + importance 0.15 + recency 0.1)",
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
