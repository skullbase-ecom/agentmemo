import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../types";
import { apiRateLimitPerMin, bumpRateWindow, nextMonthReset } from "../lib/quota";

type MW = MiddlewareHandler<{ Bindings: Env; Variables: Variables }>;

/** Enforce a per-API-key request rate limit (default 100/min). */
export const rateLimitPerKey: MW = async (c, next) => {
  const key = c.get("apiKey");
  if (!key) return next();
  const limit = apiRateLimitPerMin(c.env);
  const count = await bumpRateWindow(c.env, `key:${key.id}`, 60, Date.now());
  c.header("x-ratelimit-limit", String(limit));
  c.header("x-ratelimit-remaining", String(Math.max(0, limit - count)));
  if (count > limit) {
    c.header("retry-after", "60");
    return c.json(
      {
        error: `rate limit exceeded: ${limit} requests/minute`,
        code: "rate_limited",
        docs: "https://agentmemo.dev/docs",
        retry_after_seconds: 60,
      },
      429,
    );
  }
  return next();
};

/**
 * BETA: usage is free and unlimited — no operation quota is enforced. This
 * middleware now only *meters* usage (for display in /usage and analytics): it
 * rolls the monthly window over when expired and increments monthly_usage on
 * successful billable operations. It never blocks.
 */
export const freeTierQuota: MW = async (c, next) => {
  const key = c.get("apiKey");
  if (!key) return next();
  const now = Date.now();

  const row = await c.env.DB.prepare(
    `SELECT monthly_usage, usage_reset_date FROM api_keys WHERE id = ?`,
  )
    .bind(key.id)
    .first<{ monthly_usage: number; usage_reset_date: number | null }>();

  const reset = row?.usage_reset_date ?? 0;
  // Roll the metering window if the reset date has passed (or was never set).
  if (!reset || now >= reset) {
    await c.env.DB.prepare(
      `UPDATE api_keys SET monthly_usage = 0, usage_reset_date = ? WHERE id = ?`,
    )
      .bind(nextMonthReset(now), key.id)
      .run()
      .catch(() => {});
  }
  c.header("x-usage-unlimited", "beta");

  await next();

  // Count only successful billable operations.
  if (c.res.status >= 200 && c.res.status < 300) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare(`UPDATE api_keys SET monthly_usage = monthly_usage + 1 WHERE id = ?`)
        .bind(key.id)
        .run()
        .catch(() => {}),
    );
  }
};
