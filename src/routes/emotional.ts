import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString } from "../lib/http";
import { emotionId } from "../lib/ids";
import { requireScope } from "../middleware/auth";

// Emotional memory — how interactions felt, building a per-user profile and
// trust score over time.
const emotional = new Hono<{ Bindings: Env; Variables: Variables }>();

const SENTIMENTS = new Set(["positive", "negative", "neutral"]);

/** POST /memory/emotional — record the sentiment of an interaction. */
emotional.post("/", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const agentId = requireString(body.agent_id, "agent_id", 256);
  const userId = requireString(body.user_id, "user_id", 256);
  const sentiment = requireString(body.sentiment, "sentiment", 16);
  if (!SENTIMENTS.has(sentiment)) fail(400, "'sentiment' must be positive, negative, or neutral");

  let intensity = 5;
  if (body.intensity !== undefined) {
    const n = Number(body.intensity);
    if (!Number.isFinite(n) || n < 1 || n > 10) fail(400, "'intensity' must be a number 1..10");
    intensity = Math.round(n);
  }
  const note = body.note == null ? null : requireString(body.note, "note", 2000);

  const id = emotionId();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO emotional_memories (id, api_key_id, agent_id, user_id, sentiment, intensity, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, c.get("apiKey").id, agentId, userId, sentiment, intensity, note, now)
    .run();

  return c.json({ id, agent_id: agentId, user_id: userId, sentiment, intensity, note, created_at: now }, 201);
});

/** GET /memory/emotional/profile — aggregate emotional profile + trust score for a user. */
emotional.get("/profile", requireScope("read"), async (c) => {
  const userId = requireString(c.req.query("user_id"), "user_id", 256);
  const agentId = c.req.query("agent_id");
  const keyId = c.get("apiKey").id;

  const where = agentId
    ? `api_key_id = ? AND user_id = ? AND agent_id = ?`
    : `api_key_id = ? AND user_id = ?`;
  const binds = agentId ? [keyId, userId, agentId] : [keyId, userId];

  const rows = await c.env.DB.prepare(
    `SELECT sentiment, COUNT(*) AS n, COALESCE(AVG(intensity),0) AS avg_intensity
     FROM emotional_memories WHERE ${where} GROUP BY sentiment`,
  )
    .bind(...binds)
    .all<{ sentiment: string; n: number; avg_intensity: number }>();

  const counts = { positive: 0, negative: 0, neutral: 0 };
  let total = 0;
  let weighted = 0;
  for (const r of rows.results ?? []) {
    counts[r.sentiment as keyof typeof counts] = r.n;
    total += r.n;
    const sign = r.sentiment === "positive" ? 1 : r.sentiment === "negative" ? -1 : 0;
    weighted += sign * r.avg_intensity * r.n;
  }

  // Trust score 0..100: starts neutral (50), shifts with weighted sentiment.
  const trust =
    total === 0 ? 50 : Math.max(0, Math.min(100, Math.round(50 + (weighted / (total * 10)) * 50)));
  const dominant =
    total === 0
      ? "unknown"
      : (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral");

  return c.json({
    user_id: userId,
    agent_id: agentId ?? null,
    interactions: total,
    counts,
    dominant_sentiment: dominant,
    trust_score: trust,
  });
});

export default emotional;
