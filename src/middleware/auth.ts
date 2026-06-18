import type { MiddlewareHandler } from "hono";
import type { Env, Variables, AuthedKey } from "../types";
import { sha256Hex } from "../lib/crypto";
import { fail } from "../lib/http";

interface CachedKey extends AuthedKey {
  revoked: boolean;
}

/**
 * Authenticate requests via `Authorization: Bearer am_sk_...`.
 * Looks up the key by its SHA-256 hash, caching the (non-secret) result in KV
 * to avoid a D1 round-trip on every request.
 */
export const apiKeyAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next,
) => {
  const header = c.req.header("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) fail(401, "missing or malformed Authorization header (expected 'Bearer <key>')");

  const secret = match![1].trim();
  const hash = await sha256Hex(secret);
  const cacheKey = `auth:${hash}`;

  let record: CachedKey | null = null;

  const cached = await c.env.CACHE.get(cacheKey, "json");
  if (cached) {
    record = cached as CachedKey;
  } else {
    const row = await c.env.DB.prepare(
      `SELECT id, name, owner, scopes, tier, revoked FROM api_keys WHERE key_hash = ?`,
    )
      .bind(hash)
      .first<{
        id: string;
        name: string;
        owner: string | null;
        scopes: string;
        tier: string;
        revoked: number;
      }>();

    if (row) {
      record = {
        id: row.id,
        name: row.name,
        owner: row.owner,
        scopes: row.scopes.split(",").map((s) => s.trim()).filter(Boolean),
        tier: row.tier ?? "free",
        revoked: row.revoked === 1,
      };
      const ttl = Math.max(60, Number.parseInt(c.env.AUTH_CACHE_TTL, 10) || 120);
      await c.env.CACHE.put(cacheKey, JSON.stringify(record), { expirationTtl: ttl });
    }
  }

  if (!record) fail(401, "invalid API key");
  if (record!.revoked) fail(403, "API key has been revoked");

  c.set("apiKey", {
    id: record!.id,
    name: record!.name,
    owner: record!.owner,
    scopes: record!.scopes,
    tier: record!.tier ?? "free",
  });

  // Best-effort last-used timestamp; never blocks the request.
  c.executionCtx.waitUntil(
    c.env.DB.prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`)
      .bind(Date.now(), record!.id)
      .run()
      .catch(() => {}),
  );

  await next();
};

/** Require a given scope on the authenticated key. */
export function requireScope(scope: string): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const key = c.get("apiKey");
    if (!key.scopes.includes(scope) && !key.scopes.includes("*")) {
      fail(403, `API key is missing required scope: '${scope}'`);
    }
    await next();
  };
}
