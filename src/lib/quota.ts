import type { Env } from "../types";

// Rate limiting uses KV fixed windows (cheap, ephemeral). Monthly usage quota is
// tracked in D1 columns on api_keys (monthly_usage, usage_reset_date) so it is
// durable and reflected in GET /usage.

export function freeTierLimit(env: Env): number {
  return Math.max(0, Number.parseInt(env.FREE_TIER_MONTHLY_LIMIT, 10) || 10000);
}

export function apiRateLimitPerMin(env: Env): number {
  return Math.max(1, Number.parseInt(env.API_RATE_LIMIT_PER_MIN, 10) || 100);
}

export function signupRateLimitPerHour(env: Env): number {
  return Math.max(1, Number.parseInt(env.SIGNUP_RATE_LIMIT_PER_HOUR, 10) || 3);
}

/** Current UTC year-month, e.g. "2026-06" (informational). */
export function monthKey(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

/** Unix-ms timestamp of the first day of next month, UTC — when usage resets. */
export function nextMonthReset(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

/**
 * Fixed-window rate limiter. Returns the count after incrementing the window
 * bucket; the caller compares it against the limit. `windowSeconds` sets both
 * bucket granularity and KV TTL.
 */
export async function bumpRateWindow(
  env: Env,
  bucket: string,
  windowSeconds: number,
  now: number,
): Promise<number> {
  const window = Math.floor(now / 1000 / windowSeconds);
  const k = `rl:${bucket}:${window}`;
  const cur = await env.CACHE.get(k);
  const next = (cur ? Number.parseInt(cur, 10) || 0 : 0) + 1;
  await env.CACHE.put(k, String(next), { expirationTtl: windowSeconds + 5 });
  return next;
}
