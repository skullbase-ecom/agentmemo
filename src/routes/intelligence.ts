import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { memoryId, webhookId } from "../lib/ids";
import { requireScope } from "../middleware/auth";
import { embed } from "../lib/embeddings";

// Intelligence & collaboration endpoints mounted under /memory.
const intelligence = new Hono<{ Bindings: Env; Variables: Variables }>();

function scopeClause(keyId: string, userId?: string, agentId?: string) {
  const conds = ["api_key_id = ?"];
  const binds: unknown[] = [keyId];
  if (userId) { conds.push("user_id = ?"); binds.push(userId); }
  if (agentId) { conds.push("agent_id = ?"); binds.push(agentId); }
  return { where: conds.join(" AND "), binds };
}

/** GET /memory/health — memory quality report (duplicates, stale, conflicts, score). */
intelligence.get("/health", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = c.req.query("user_id");
  const agentId = c.req.query("agent_id");
  const { where, binds } = scopeClause(keyId, userId, agentId);
  const now = Date.now();
  const staleCutoff = now - 90 * 86_400_000;

  const total = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memories WHERE ${where}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const stale = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memories WHERE ${where} AND created_at < ?`).bind(...binds, staleCutoff).first<{ n: number }>())?.n ?? 0;
  const dupRows = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM (SELECT content FROM memories WHERE ${where} GROUP BY content HAVING COUNT(*) > 1)`,
  ).bind(...binds).first<{ n: number }>();
  const duplicates = dupRows?.n ?? 0;
  const conflicts = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memory_links WHERE api_key_id = ? AND relationship = 'contradicts'`).bind(keyId).first<{ n: number }>())?.n ?? 0;

  // Quality score 0..10.
  let score = 10;
  if (total > 0) {
    score -= Math.min(3, (duplicates / total) * 10);
    score -= Math.min(2, (stale / total) * 5);
    score -= Math.min(3, conflicts * 0.5);
  }
  score = Math.max(0, Math.round(score * 10) / 10);

  return c.json({
    scope: { user_id: userId ?? null, agent_id: agentId ?? null },
    total_memories: total,
    stale_memories: stale,
    duplicate_groups: duplicates,
    conflicts,
    compression_opportunity: total > 1000,
    quality_score: score,
  });
});

/** GET /memory/insights — surfaced patterns about stored memories. */
intelligence.get("/insights", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = c.req.query("user_id");
  const agentId = c.req.query("agent_id");
  const { where, binds } = scopeClause(keyId, userId, agentId);

  const total = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memories WHERE ${where}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const conflicts = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memory_links WHERE api_key_id = ? AND relationship = 'contradicts'`).bind(keyId).first<{ n: number }>())?.n ?? 0;
  const tagRows = await c.env.DB.prepare(
    `SELECT tags FROM memories WHERE ${where} AND tags IS NOT NULL LIMIT 500`,
  ).bind(...binds).all<{ tags: string }>();

  const tagCounts: Record<string, number> = {};
  for (const r of tagRows.results ?? []) for (const t of r.tags.split(",")) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

  const insights: string[] = [];
  if (total === 0) insights.push("No memories yet — start storing to build a profile.");
  if (conflicts > 0) insights.push(`${conflicts} contradicting memory pair(s) detected — consider resolving via /memory/graph/conflicts.`);
  if (total > 1000) insights.push("Over 1,000 memories — compression recommended (POST /memory/compress).");
  if (topTags.length) insights.push(`Most common topics: ${topTags.join(", ")}.`);
  if (insights.length === 0) insights.push("Memory store looks healthy.");

  return c.json({
    scope: { user_id: userId ?? null, agent_id: agentId ?? null },
    total_memories: total,
    top_tags: topTags,
    insights,
    refreshed_at: Date.now(),
  });
});

/** GET /memory/predict — predict likely-needed memories for the current context. */
intelligence.get("/predict", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = requireString(c.req.query("user_id"), "user_id", 256);
  const agentId = c.req.query("agent_id");
  const limit = parseLimit(c.req.query("limit"), 5, 20);
  const { where, binds } = scopeClause(keyId, userId, agentId);

  // Heuristic v1: surface highest-importance + most-recent memories as likely-needed.
  const { results } = await c.env.DB.prepare(
    `SELECT id, content, importance, created_at FROM memories
     WHERE ${where} AND (expires_at IS NULL OR expires_at > ?)
     ORDER BY importance DESC, created_at DESC LIMIT ?`,
  ).bind(...binds, Date.now(), limit).all();

  return c.json({
    strategy: "importance+recency (v1)",
    note: "Sequence-based predictive prefetch is in beta; this returns the most likely-relevant memories.",
    predicted: results ?? [],
  });
});

/** POST /memory/transfer — transfer memories from one agent to another (optionally summarized). */
intelligence.post("/transfer", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const userId = requireString(body.user_id, "user_id", 256);
  const fromAgent = requireString(body.from_agent, "from_agent", 256);
  const toAgent = requireString(body.to_agent, "to_agent", 256);
  const keyId = c.get("apiKey").id;

  const { results } = await c.env.DB.prepare(
    `SELECT content FROM memories WHERE api_key_id = ? AND user_id = ? AND agent_id = ? ORDER BY created_at LIMIT 500`,
  ).bind(keyId, userId, fromAgent).all<{ content: string }>();
  const rows = results ?? [];
  if (rows.length === 0) return c.json({ transferred: 0, message: "no memories to transfer" });

  const now = Date.now();
  let transferred = 0;
  for (const r of rows) {
    let embedding: string | null = null;
    try { embedding = JSON.stringify((await embed(c.env, r.content)).vector); } catch { /* ignore */ }
    await c.env.DB.prepare(
      `INSERT INTO memories (id, api_key_id, user_id, agent_id, content, metadata, embedding, importance, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '{}', ?, 0, 'transferred', ?, ?)`,
    ).bind(memoryId(), keyId, userId, toAgent, r.content, embedding, now, now).run();
    transferred++;
  }
  return c.json({ transferred, from_agent: fromAgent, to_agent: toAgent, user_id: userId }, 201);
});

/** POST /memory/subscribe — subscribe to memory events via webhook. */
intelligence.post("/subscribe", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const url = requireString(body.webhook_url ?? body.url, "webhook_url", 2000);
  const events = Array.isArray(body.events) ? (body.events as string[]).join(",") : "memory.stored";
  const id = webhookId();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO webhooks (id, api_key_id, url, events, active, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
  ).bind(id, c.get("apiKey").id, url, events, now).run();
  return c.json({ id, url, events: events.split(","), status: "subscribed", delivery: "beta", created_at: now }, 201);
});

export default intelligence;
