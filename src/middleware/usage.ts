import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../types";
import { usageId } from "../lib/ids";

/**
 * Records one usage_event per authenticated request after the handler runs.
 * Token counts are reported by handlers via `c.set` on the response header
 * `x-am-tokens` (internal), defaulting to 0. Writes are fire-and-forget so
 * accounting never adds latency to the response.
 */
export const trackUsage: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next,
) => {
  const start = Date.now();
  await next();

  const key = c.get("apiKey");
  if (!key) return; // unauthenticated route; nothing to bill

  const latency = Date.now() - start;
  const tokens = Number.parseInt(c.res.headers.get("x-am-tokens") ?? "0", 10) || 0;
  const route = `${c.req.method} ${new URL(c.req.url).pathname}`;
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      `INSERT INTO usage_events (id, api_key_id, route, status, tokens, latency_ms, created_at, day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(usageId(), key.id, route, c.res.status, tokens, latency, now, day)
      .run()
      .catch(() => {}),
  );
};

/** Strip the internal token-accounting header before the response leaves. */
export const stripInternalHeaders: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  async (c, next) => {
    await next();
    c.res.headers.delete("x-am-tokens");
  };
