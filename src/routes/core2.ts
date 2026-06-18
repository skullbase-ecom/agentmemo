import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { memoryId } from "../lib/ids";
import { sha256Hex } from "../lib/crypto";
import { embed, approxTokens } from "../lib/embeddings";
import { classifyOne } from "../lib/classify";
import { audit } from "../lib/security";
import { requireScope } from "../middleware/auth";

// Section 2 core API: context, batch, feedback, stale, verify, stats, expired,
// conflicts, timeline. Mounted under /memory.
const core2 = new Hono<{ Bindings: Env; Variables: Variables }>();

const STALE_MS = 30 * 86_400_000;

/** GET /memory/context — memories pre-formatted for LLM system-prompt injection. */
core2.get("/context", requireScope("read"), async (c) => {
  const userId = requireString(c.req.query("user_id"), "user_id", 256);
  const agentId = c.req.query("agent_id");
  const maxTokens = Math.min(8000, Math.max(100, Number.parseInt(c.req.query("max_tokens") ?? "2000", 10) || 2000));
  const format = (c.req.query("format") ?? "raw").toLowerCase();
  const keyId = c.get("apiKey").id;
  const now = Date.now();

  const where = agentId ? `api_key_id = ? AND user_id = ? AND agent_id = ?` : `api_key_id = ? AND user_id = ?`;
  const binds = agentId ? [keyId, userId, agentId] : [keyId, userId];
  const { results } = await c.env.DB.prepare(
    `SELECT content, importance FROM memories
     WHERE ${where} AND (expires_at IS NULL OR expires_at > ?)
       AND (valid_until IS NULL OR valid_until > ?)
     ORDER BY importance DESC, created_at DESC LIMIT 500`,
  ).bind(...binds, now, now).all<{ content: string; importance: number }>();

  const all = results ?? [];
  const lines: string[] = [];
  let tokenCount = 0;
  let used = 0;
  for (const m of all) {
    const t = approxTokens(m.content);
    if (tokenCount + t > maxTokens) break;
    lines.push(`- ${m.content}`);
    tokenCount += t;
    used++;
  }

  const raw = lines.join("\n");
  const anthropic = `<memory>\n${raw}\n</memory>`;
  const openai = `Previous context you remember about this user:\n${raw}`;
  const totalTokens = all.reduce((s, m) => s + approxTokens(m.content), 0);

  const formatted = { anthropic, openai, raw };
  const chosen = format === "anthropic" ? anthropic : format === "openai" ? openai : raw;

  return c.json({
    context: chosen,
    token_count: tokenCount,
    memories_used: used,
    memories_available: all.length,
    formatted,
    tokens_saved: Math.max(0, totalTokens - tokenCount),
  });
});

/** POST /memory/batch — store up to 100 memories in one call. */
core2.post("/batch", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  if (!Array.isArray(body.memories)) fail(400, "'memories' must be an array");
  const items = body.memories as Record<string, unknown>[];
  if (items.length === 0) fail(400, "'memories' must not be empty");
  if (items.length > 100) fail(400, "batch is limited to 100 memories per request");

  const keyId = c.get("apiKey").id;
  const now = Date.now();
  const ids: string[] = [];
  let stored = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const m of items) {
    const content = typeof m.content === "string" ? m.content : null;
    const userId = m.user_id as string;
    const agentId = m.agent_id as string;
    if (!content || !userId || !agentId) { skipped++; continue; }

    const hash = await sha256Hex(content);
    const dup = await c.env.DB.prepare(
      `SELECT id FROM memories WHERE api_key_id = ? AND content_hash = ? AND user_id = ? AND agent_id = ? LIMIT 1`,
    ).bind(keyId, hash, userId, agentId).first<{ id: string }>();
    if (dup) { duplicates++; continue; }

    let embedding: string | null = null;
    try { embedding = JSON.stringify((await embed(c.env, content)).vector); } catch { /* unembedded */ }

    const id = memoryId();
    const ns = (m.namespace as string) ?? "default";
    const tags = Array.isArray(m.tags) ? (m.tags as string[]).join(",") : null;
    await c.env.DB.prepare(
      `INSERT INTO memories (id, api_key_id, user_id, agent_id, content, metadata, embedding, importance,
         namespace, tags, category, content_hash, written_by, write_protocol, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?, ?, 'REST', ?, ?)`,
    ).bind(id, keyId, userId, agentId, content, embedding, Number(m.importance) || 0, ns, tags, classifyOne(content), hash, keyId, now, now).run();
    ids.push(id);
    stored++;
  }

  return c.json({ stored, skipped, duplicates_skipped: duplicates, ids }, 201);
});

/** POST /memory/feedback — update a memory's outcome (EMA) after it was used. */
core2.post("/feedback", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const memId = requireString(body.memory_id, "memory_id", 64);
  const outcome = requireString(body.outcome, "outcome", 16);
  if (!["success", "failure"].includes(outcome)) fail(400, "'outcome' must be success or failure");
  const confidence = body.confidence == null ? 1 : Math.max(0, Math.min(1, Number(body.confidence) || 0));
  const keyId = c.get("apiKey").id;

  const row = await c.env.DB.prepare(`SELECT outcome_score FROM memories WHERE id = ? AND api_key_id = ?`)
    .bind(memId, keyId).first<{ outcome_score: number }>();
  if (!row) fail(404, "memory not found");

  const target = outcome === "success" ? confidence : 1 - confidence;
  const alpha = 0.3;
  const newScore = Number(((row!.outcome_score ?? 0) * (1 - alpha) + target * alpha).toFixed(4));

  await c.env.DB.prepare(`UPDATE memories SET outcome = ?, outcome_score = ? WHERE id = ? AND api_key_id = ?`)
    .bind(outcome, newScore, memId, keyId).run();
  c.executionCtx.waitUntil(audit(c.env, { memory_id: memId, action: "feedback", api_key_id: keyId, outcome, now: Date.now() }));

  return c.json({ memory_id: memId, outcome, outcome_score: newScore });
});

/** GET /memory/stale — memories not retrieved/verified in 30+ days. */
core2.get("/stale", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = c.req.query("user_id");
  const cutoff = Date.now() - STALE_MS;
  const conds = ["api_key_id = ?", "created_at < ?", "(last_retrieved_at IS NULL OR last_retrieved_at < ?)", "(verified_at IS NULL OR verified_at < ?)"];
  const binds: unknown[] = [keyId, cutoff, cutoff, cutoff];
  if (userId) { conds.push("user_id = ?"); binds.push(userId); }
  const limit = parseLimit(c.req.query("limit"), 100, 500);

  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, agent_id, content, created_at, last_retrieved_at FROM memories
     WHERE ${conds.join(" AND ")} ORDER BY created_at ASC LIMIT ?`,
  ).bind(...binds, limit).all<{ created_at: number }>();
  const rows = results ?? [];
  return c.json({
    count: rows.length,
    oldest_unverified: rows.length ? new Date(rows[0].created_at).toISOString().slice(0, 10) : null,
    stale_memories: rows,
  });
});

/** POST /memory/verify/:id — mark a memory still valid. */
core2.post("/verify/:id", requireScope("write"), async (c) => {
  const memId = c.req.param("id");
  const keyId = c.get("apiKey").id;
  const now = Date.now();
  const res = await c.env.DB.prepare(
    `UPDATE memories SET verified_at = ?, last_retrieved_at = ? WHERE id = ? AND api_key_id = ?`,
  ).bind(now, now, memId, keyId).run();
  if ((res.meta?.changes ?? 0) === 0) fail(404, "memory not found");
  c.executionCtx.waitUntil(audit(c.env, { memory_id: memId, action: "verify", api_key_id: keyId, now }));
  return c.json({ verified: true, memory_id: memId, verified_at: now });
});

/** GET /memory/conflicts — list detected contradictions (alias of graph/conflicts). */
core2.get("/conflicts", requireScope("read"), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT l.id, l.from_id, l.to_id, a.content AS content_a, b.content AS content_b
     FROM memory_links l LEFT JOIN memories a ON a.id = l.from_id LEFT JOIN memories b ON b.id = l.to_id
     WHERE l.api_key_id = ? AND l.relationship = 'contradicts' ORDER BY l.created_at DESC LIMIT 100`,
  ).bind(c.get("apiKey").id).all<{ from_id: string; to_id: string; content_a: string; content_b: string }>();
  const conflicts = (results ?? []).map((r) => ({
    memory_a: { id: r.from_id, content: r.content_a },
    memory_b: { id: r.to_id, content: r.content_b },
    conflict_type: "contradiction",
  }));
  return c.json({ count: conflicts.length, conflicts });
});

/** GET /memory/stats — comprehensive memory statistics + quality score. */
core2.get("/stats", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = c.req.query("user_id");
  const where = userId ? `api_key_id = ? AND user_id = ?` : `api_key_id = ?`;
  const binds = userId ? [keyId, userId] : [keyId];
  const now = Date.now();

  const grp = async (col: string) =>
    Object.fromEntries(
      ((await c.env.DB.prepare(`SELECT ${col} AS k, COUNT(*) AS n FROM memories WHERE ${where} GROUP BY ${col}`).bind(...binds).all<{ k: string; n: number }>()).results ?? [])
        .map((r) => [r.k ?? "null", r.n]),
    );

  const total = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memories WHERE ${where}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const avgImp = (await c.env.DB.prepare(`SELECT COALESCE(AVG(importance),0) AS n FROM memories WHERE ${where}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const stale = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memories WHERE ${where} AND created_at < ? AND (last_retrieved_at IS NULL OR last_retrieved_at < ?)`).bind(...binds, now - STALE_MS, now - STALE_MS).first<{ n: number }>())?.n ?? 0;
  const compressed = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memories WHERE ${where} AND tags LIKE '%compressed%'`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const conflicts = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memory_links WHERE api_key_id = ? AND relationship = 'contradicts'`).bind(keyId).first<{ n: number }>())?.n ?? 0;
  const oldest = (await c.env.DB.prepare(`SELECT MIN(created_at) AS n FROM memories WHERE ${where}`).bind(...binds).first<{ n: number | null }>())?.n ?? null;

  const byCategory = await grp("category");
  const byNamespace = await grp("namespace");
  const byOutcome = await grp("outcome");

  const diversity = Math.min(100, Object.keys(byCategory).length * 14);
  const freshness = total ? Math.max(0, Math.round(100 - (stale / total) * 100)) : 100;
  const accuracy = total ? Math.max(0, Math.round(100 - (conflicts / total) * 100)) : 100;
  const coverage = Math.min(100, Math.round((total / 100) * 100));
  const quality = Math.round((diversity + freshness + accuracy + coverage) / 4);

  return c.json({
    total_memories: total,
    by_namespace: byNamespace,
    by_category: byCategory,
    by_outcome: byOutcome,
    avg_importance: Number(avgImp.toFixed(1)),
    stale_count: stale,
    compressed_count: compressed,
    conflict_count: conflicts,
    oldest_memory: oldest ? new Date(oldest).toISOString().slice(0, 10) : null,
    memory_quality_score: quality,
    quality_breakdown: { diversity, freshness, accuracy, coverage },
  });
});

/** GET /memory/timeline — fact evolution over time for a topic. */
core2.get("/timeline", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = requireString(c.req.query("user_id"), "user_id", 256);
  const topic = requireString(c.req.query("topic"), "topic", 256);
  const like = `%${topic}%`;
  const { results } = await c.env.DB.prepare(
    `SELECT id, content, valid_from, valid_until, created_at FROM memories
     WHERE api_key_id = ? AND user_id = ? AND (content LIKE ? OR tags LIKE ?)
     ORDER BY COALESCE(valid_from, created_at) ASC LIMIT 100`,
  ).bind(keyId, userId, like, like).all();
  return c.json({ user_id: userId, topic, timeline: results ?? [] });
});

/** DELETE /memory/expired — delete all expired memories for the key. */
core2.delete("/expired", requireScope("write"), async (c) => {
  const keyId = c.get("apiKey").id;
  const res = await c.env.DB.prepare(
    `DELETE FROM memories WHERE api_key_id = ? AND expires_at IS NOT NULL AND expires_at < ?`,
  ).bind(keyId, Date.now()).run();
  return c.json({ deleted: res.meta?.changes ?? 0 });
});

export default core2;
