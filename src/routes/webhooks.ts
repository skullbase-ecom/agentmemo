import { Hono } from "hono";
import type { Env, Variables } from "../types";

// Dodo Payments webhook. Dodo uses Standard Webhooks signing (webhook-id,
// webhook-timestamp, webhook-signature headers; HMAC-SHA256 over
// `${id}.${timestamp}.${body}` with the base64 secret after the `whsec_` prefix).
// On a successful/active payment we upgrade the customer's key(s) to the Pro
// tier; on cancellation/refund we downgrade to Free.

const webhooks = new Hono<{ Bindings: Env; Variables: Variables }>();

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
  const email = extractEmail(event);

  if (!email) {
    return c.json({ ok: true, note: "no customer email in payload; nothing to do" });
  }

  const upgrade = /(succeeded|active|completed|paid|renewed)/i.test(type);
  const downgrade = /(cancel|refund|expired|failed|past_due|dispute)/i.test(type);

  let tier: string | null = null;
  if (upgrade && !downgrade) tier = "pro";
  else if (downgrade) tier = "free";

  if (tier) {
    const res = await c.env.DB.prepare(`UPDATE api_keys SET tier = ? WHERE owner = ?`)
      .bind(tier, email)
      .run();
    return c.json({ ok: true, event: type, owner: email, set_tier: tier, keys_updated: res.meta?.changes ?? 0 });
  }

  return c.json({ ok: true, event: type, note: "no tier change for this event" });
});

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
