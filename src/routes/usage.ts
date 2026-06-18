import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { parseLimit } from "../lib/http";
import { freeTierLimit } from "../lib/quota";

const usage = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /usage — usage summary for the calling API key.
 * Query params:
 *   from   unix-ms lower bound (default: 30 days ago)
 *   to     unix-ms upper bound (default: now)
 *   days   number of recent daily buckets to return (default 30, max 365)
 */
usage.get("/", async (c) => {
  const key = c.get("apiKey");
  const now = Date.now();
  const from = Number.parseInt(c.req.query("from") ?? "", 10);
  const to = Number.parseInt(c.req.query("to") ?? "", 10);
  const lower = Number.isNaN(from) ? now - 30 * 24 * 60 * 60 * 1000 : from;
  const upper = Number.isNaN(to) ? now : to;
  const days = parseLimit(c.req.query("days"), 30, 365);

  // Overall totals over the window.
  const totals = await c.env.DB.prepare(
    `SELECT
       COUNT(*)            AS requests,
       COALESCE(SUM(tokens), 0)     AS tokens,
       COALESCE(AVG(latency_ms), 0) AS avg_latency_ms,
       COALESCE(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END), 0) AS errors
     FROM usage_events
     WHERE api_key_id = ? AND created_at BETWEEN ? AND ?`,
  )
    .bind(key.id, lower, upper)
    .first<{ requests: number; tokens: number; avg_latency_ms: number; errors: number }>();

  // Per-route breakdown.
  const byRoute = await c.env.DB.prepare(
    `SELECT route, COUNT(*) AS requests, COALESCE(SUM(tokens), 0) AS tokens
     FROM usage_events
     WHERE api_key_id = ? AND created_at BETWEEN ? AND ?
     GROUP BY route ORDER BY requests DESC`,
  )
    .bind(key.id, lower, upper)
    .all<{ route: string; requests: number; tokens: number }>();

  // Daily buckets.
  const daily = await c.env.DB.prepare(
    `SELECT day, COUNT(*) AS requests, COALESCE(SUM(tokens), 0) AS tokens
     FROM usage_events
     WHERE api_key_id = ? AND created_at BETWEEN ? AND ?
     GROUP BY day ORDER BY day DESC LIMIT ?`,
  )
    .bind(key.id, lower, upper, days)
    .all<{ day: string; requests: number; tokens: number }>();

  // Current-month quota status, read from the durable D1 counters.
  const acct = await c.env.DB.prepare(
    `SELECT tier, monthly_usage, usage_reset_date FROM api_keys WHERE id = ?`,
  )
    .bind(key.id)
    .first<{ tier: string; monthly_usage: number; usage_reset_date: number | null }>();

  const tier = acct?.tier ?? key.tier ?? "free";
  const limit = freeTierLimit(c.env);
  const used = acct?.monthly_usage ?? 0;

  return c.json({
    api_key_id: key.id,
    name: key.name,
    // Top-level quota fields.
    used,
    limit: tier === "free" ? limit : null,
    tier,
    reset_date: acct?.usage_reset_date ?? null,
    remaining: tier === "free" ? Math.max(0, limit - used) : null,
    unlimited: tier !== "free",
    window: { from: lower, to: upper },
    totals: {
      requests: totals?.requests ?? 0,
      tokens: totals?.tokens ?? 0,
      errors: totals?.errors ?? 0,
      avg_latency_ms: Math.round(totals?.avg_latency_ms ?? 0),
    },
    by_route: byRoute.results ?? [],
    daily: daily.results ?? [],
  });
});

export default usage;
