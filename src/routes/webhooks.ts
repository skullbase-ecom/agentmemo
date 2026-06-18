import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { webhookId } from "../lib/ids";
import { requireScope } from "../middleware/auth";

const WEBHOOK_EVENTS = [
  "memory.stored",
  "memory.retrieved",
  "memory.deleted",
  "usage.limit_approaching",
  "agent.registered",
];

// Dodo Payments webhook. Dodo uses Standard Webhooks signing (webhook-id,
// webhook-timestamp, webhook-signature headers; HMAC-SHA256 over
// `${id}.${timestamp}.${body}` with the base64 secret after the `whsec_` prefix).
// On a successful/active payment we upgrade the customer's key(s) to the Pro
// tier; on cancellation/refund we downgrade to Free.

const webhooks = new Hono<{ Bindings: Env; Variables: Variables }>();

/** POST /webhooks/register — register a webhook URL for memory events (auth required). */
webhooks.post("/register", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const url = requireString(body.url, "url", 2000);
  if (!/^https:\/\//i.test(url)) fail(400, "'url' must be an https URL");
  let events = WEBHOOK_EVENTS;
  if (body.events !== undefined) {
    if (!Array.isArray(body.events) || body.events.some((e) => typeof e !== "string")) {
      fail(400, "'events' must be an array of strings");
    }
    const bad = (body.events as string[]).find((e) => !WEBHOOK_EVENTS.includes(e));
    if (bad) fail(400, `unknown event '${bad}'. Valid: ${WEBHOOK_EVENTS.join(", ")}`);
    events = body.events as string[];
  }
  const id = webhookId();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO webhooks (id, api_key_id, url, events, active, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
  )
    .bind(id, c.get("apiKey").id, url, events.join(","), now)
    .run();
  return c.json({ id, url, events, active: true, delivery: "retries with exponential backoff (beta)", created_at: now }, 201);
});

/** GET /webhooks/logs — registered webhooks + delivery logs for the key. */
webhooks.get("/logs", requireScope("read"), async (c) => {
  const limit = parseLimit(c.req.query("limit"), 50, 200);
  const { results } = await c.env.DB.prepare(
    `SELECT id, url, events, active, created_at FROM webhooks WHERE api_key_id = ? ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(c.get("apiKey").id, limit)
    .all<{ id: string; url: string; events: string; active: number; created_at: number }>();
  const hooks = (results ?? []).map((w) => ({ ...w, events: w.events.split(","), active: w.active === 1 }));
  return c.json({ webhooks: hooks, deliveries: [], note: "Event delivery is in beta." });
});

async function verifyStandardWebhook(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
): Promise<boolean> {
  const secretBytes = base64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const expected = bytesToBase64(new Uint8Array(sig));
  // Header may contain multiple space-separated `v1,<sig>` entries.
  return signatureHeader
    .split(" ")
    .map((p) => (p.includes(",") ? p.split(",")[1] : p))
    .some((s) => s === expected);
}

webhooks.post("/dodo", async (c) => {
  const raw = await c.req.text();
  const secret = c.env.DODO_WEBHOOK_SECRET;

  if (secret) {
    const id = c.req.header("webhook-id") || "";
    const ts = c.req.header("webhook-timestamp") || "";
    const sig = c.req.header("webhook-signature") || "";
    const ok = id && ts && sig && (await verifyStandardWebhook(secret, id, ts, raw, sig).catch(() => false));
    if (!ok) return c.json({ error: { status: 401, message: "invalid webhook signature" } }, 401);
  } else {
    console.warn("DODO_WEBHOOK_SECRET not set; accepting webhook unverified");
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return c.json({ error: { status: 400, message: "invalid JSON" } }, 400);
  }

  const type = String(event.type ?? event.event_type ?? "");
  const keyId = extractKeyId(event);
  const email = extractEmail(event);

  const upgrade = /(succeeded|active|completed|paid|renewed)/i.test(type);
  const downgrade = /(cancel|refund|expired|failed|past_due|dispute)/i.test(type);

  let tier: string | null = null;
  if (upgrade && !downgrade) tier = "pro";
  else if (downgrade) tier = "free";

  if (!tier) {
    return c.json({ ok: true, event: type, note: "no tier change for this event" });
  }

  // Preferred: match by the PUBLIC key id carried in subscription metadata
  // (works for emailless agents). Public ids are safe to share — no secret travels
  // through the payment provider, and no hashing is needed.
  if (keyId) {
    const res = await c.env.DB.prepare(`UPDATE api_keys SET tier = ? WHERE id = ?`)
      .bind(tier, keyId)
      .run();
    if ((res.meta?.changes ?? 0) > 0) {
      return c.json({ ok: true, event: type, matched_by: "metadata.agentmemo_key_id", set_tier: tier, keys_updated: res.meta?.changes ?? 0 });
    }
    // metadata key id didn't match a known key — fall through to email.
  }

  // Fallback: match by customer email -> owner.
  if (email) {
    const res = await c.env.DB.prepare(`UPDATE api_keys SET tier = ? WHERE owner = ?`)
      .bind(tier, email)
      .run();
    return c.json({ ok: true, event: type, matched_by: "email", owner: email, set_tier: tier, keys_updated: res.meta?.changes ?? 0 });
  }

  return c.json({ ok: true, event: type, note: "no agentmemo_key_id in metadata and no customer email; nothing to upgrade" });
});

/** Pull metadata.agentmemo_key_id (public id, am_pk_) from common Dodo payload shapes. */
function extractKeyId(event: Record<string, unknown>): string | null {
  const data = (event.data ?? event) as Record<string, unknown>;
  const metas = [
    data.metadata as Record<string, unknown> | undefined,
    (data.subscription as Record<string, unknown> | undefined)?.metadata as Record<string, unknown> | undefined,
    (data.payment as Record<string, unknown> | undefined)?.metadata as Record<string, unknown> | undefined,
    event.metadata as Record<string, unknown> | undefined,
  ];
  for (const m of metas) {
    const v = m?.agentmemo_key_id;
    if (typeof v === "string" && v.startsWith("am_pk_")) return v;
  }
  return null;
}

function extractEmail(event: Record<string, unknown>): string | null {
  const data = (event.data ?? event) as Record<string, unknown>;
  const candidates = [
    (data.customer as Record<string, unknown> | undefined)?.email,
    data.customer_email,
    data.email,
    (event.customer as Record<string, unknown> | undefined)?.email,
  ];
  for (const v of candidates) if (typeof v === "string" && v.includes("@")) return v;
  return null;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export default webhooks;
