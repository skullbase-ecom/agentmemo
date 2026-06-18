import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString } from "../lib/http";
import { generateApiKey, sha256Hex, timingSafeEqual } from "../lib/crypto";
import { nextMonthReset } from "../lib/quota";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

const VALID_SCOPES = new Set(["read", "write", "*"]);

interface CreateKeyBody {
  name?: unknown;
  owner?: unknown;
  scopes?: unknown;
  tier?: unknown;
}

/**
 * POST /auth/keys — mint a new developer API key.
 * Protected by the admin secret: `Authorization: Bearer <ADMIN_SECRET>`.
 * The plaintext secret is returned exactly once and never stored.
 */
auth.post("/keys", async (c) => {
  const adminSecret = c.env.ADMIN_SECRET;
  if (!adminSecret) {
    fail(403, "key minting is disabled: ADMIN_SECRET is not configured");
  }

  const header = c.req.header("authorization") ?? "";
  const provided = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  if (!provided || !timingSafeEqual(provided, adminSecret!)) {
    fail(401, "invalid admin credentials");
  }

  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as CreateKeyBody;
  const name = requireString(body.name, "name", 200);
  const owner = body.owner === undefined ? null : requireString(body.owner, "owner", 256);

  let scopes = ["read", "write"];
  if (body.scopes !== undefined) {
    if (!Array.isArray(body.scopes) || body.scopes.some((s) => typeof s !== "string")) {
      fail(400, "'scopes' must be an array of strings");
    }
    const requested = (body.scopes as string[]).map((s) => s.trim()).filter(Boolean);
    for (const s of requested) {
      if (!VALID_SCOPES.has(s)) fail(400, `unknown scope '${s}' (valid: read, write, *)`);
    }
    if (requested.length === 0) fail(400, "'scopes' must not be empty");
    scopes = requested;
  }

  // Admin-minted keys default to the Pro (unlimited) tier; pass tier:"free" to override.
  let tier = "pro";
  if (body.tier !== undefined) {
    if (body.tier !== "free" && body.tier !== "pro") fail(400, "'tier' must be 'free' or 'pro'");
    tier = body.tier;
  }

  const { id, secret } = generateApiKey();
  const keyHash = await sha256Hex(secret);
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO api_keys (id, key_hash, name, owner, scopes, tier, source, monthly_usage, usage_reset_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'admin', 0, ?, ?)`,
  )
    .bind(id, keyHash, name, owner, scopes.join(","), tier, nextMonthReset(now), now)
    .run();

  return c.json(
    {
      id,
      // Shown only once. Store it securely — it cannot be recovered.
      key: secret,
      name,
      owner,
      scopes,
      tier,
      created_at: now,
    },
    201,
  );
});

export default auth;
