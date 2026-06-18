import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { parseLimit } from "../lib/http";
import { requireScope } from "../middleware/auth";

// Usage analytics for the calling key.
const analytics = new Hono<{ Bindings: Env; Variables: Variables }>();

/** GET /analytics/daily — daily request + token breakdown. */
analytics.get("/daily", requireScope("read"), async (c) => {
  const days = parseLimit(c.req.query("days"), 30, 365);
  const { results } = await c.env.DB.prepare(
    `SELECT day, COUNT(*) AS requests, COALESCE(SUM(tokens),0) AS tokens,
            COALESCE(AVG(latency_ms),0) AS avg_latency_ms
     FROM usage_events WHERE api_key_id = ? GROUP BY day ORDER BY day DESC LIMIT ?`,
  )
    .bind(c.get("apiKey").id, days)
    .all();
  return c.json({ daily: results ?? [] });
});

/** GET /analytics/agents — per-agent memory counts. */
analytics.get("/agents", requireScope("read"), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT agent_id, COUNT(*) AS memories, MAX(created_at) AS last_activity
     FROM memories WHERE api_key_id = ? GROUP BY agent_id ORDER BY memories DESC LIMIT 200`,
  )
    .bind(c.get("apiKey").id)
    .all();
  return c.json({ agents: results ?? [] });
});

/** GET /analytics/patterns — memory access patterns by route. */
analytics.get("/patterns", requireScope("read"), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT route, COUNT(*) AS calls, COALESCE(AVG(latency_ms),0) AS avg_latency_ms
     FROM usage_events WHERE api_key_id = ? GROUP BY route ORDER BY calls DESC`,
  )
    .bind(c.get("apiKey").id)
    .all();
  return c.json({ patterns: results ?? [] });
});

export default analytics;
