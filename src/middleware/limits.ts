import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../types";
import { apiRateLimitPerMin, bumpRateWindow, freeTierLimit, nextMonthReset } from "../lib/quota";

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
      { error: "rate limit exceeded", limit, window: "1m", retry_after_seconds: 60 },
      429,
    );
  }
  return next();
};

/**
 * Enforce the free-tier monthly operation quota and meter usage in D1.
 * Pre: roll the monthly window over if expired; block free-tier keys at/over the
 * limit with a 429 + Retry-After. Post: on a successful (2xx) billable response,
 * increment monthly_usage.
 */
export const freeTierQuota: MW = async (c, next) => {
  const key = c.get("apiKey");
  if (!key) return next();
  const now = Date.now();

  const row = await c.env.DB.prepare(
    `SELECT tier, monthly_usage, usage_reset_date FROM api_keys WHERE id = ?`,
  )
    .bind(key.id)
    .first<{ tier: string; monthly_usage: number; usage_reset_date: number | null }>();

  const tier = row?.tier ?? key.tier ?? "free";
  let used = row?.monthly_usage ?? 0;
  const reset = row?.usage_reset_date ?? 0;

  // Roll the window if the reset date has passed (or was never set).
  if (!reset || now >= reset) {
    used = 0;
    await c.env.DB.prepare(
      `UPDATE api_keys SET monthly_usage = 0, usage_reset_date = ? WHERE id = ?`,
    )
      .bind(nextMonthReset(now), key.id)
      .run()
      .catch(() => {});
  }

  if (tier === "free") {
    const limit = freeTierLimit(c.env);
    c.header("x-usage-limit", String(limit));
    c.header("x-usage-count", String(used));
    if (used >= limit) {
      const secondsToReset = Math.max(
        60,
        Math.ceil(((reset || nextMonthReset(now)) - now) / 1000),
      );
      c.header("retry-after", String(secondsToReset));
      return c.json(
        { error: "free tier limit reached", upgrade: "https://agentmemo.dev/pricing" },
        429,
      );
    }
  }

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
