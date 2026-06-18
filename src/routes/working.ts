import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString } from "../lib/http";
import { requireScope } from "../middleware/auth";

// Working memory — short-term context for the current task. KV-backed, auto-
// expires after 1 hour. Scoped to (api_key, session_id) — the agent's "RAM".
const working = new Hono<{ Bindings: Env; Variables: Variables }>();

const TTL = 3600; // 1 hour
const MAX_ITEMS = 100;

function wkey(keyId: string, session: string): string {
  return `wm:${keyId}:${session}`;
}

interface WorkingItem {
  at: number;
  content: unknown;
}

/** POST /memory/working — append temporary context to the session's working memory. */
working.post("/", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const session = requireString(body.session_id, "session_id", 256);
  if (body.content === undefined) fail(400, "'content' is required");

  const k = wkey(c.get("apiKey").id, session);
  const existing = ((await c.env.CACHE.get(k, "json")) as WorkingItem[] | null) ?? [];
  existing.push({ at: Date.now(), content: body.content });
  const trimmed = existing.slice(-MAX_ITEMS);
  await c.env.CACHE.put(k, JSON.stringify(trimmed), { expirationTtl: TTL });

  return c.json({ session_id: session, items: trimmed.length, expires_in: TTL }, 201);
});

/** GET /memory/working — retrieve current working memory for a session. */
working.get("/", requireScope("read"), async (c) => {
  const session = requireString(c.req.query("session_id"), "session_id", 256);
  const k = wkey(c.get("apiKey").id, session);
  const items = ((await c.env.CACHE.get(k, "json")) as WorkingItem[] | null) ?? [];
  return c.json({ session_id: session, count: items.length, items });
});

/** DELETE /memory/working — clear working memory for a session. */
working.delete("/", requireScope("write"), async (c) => {
  const session = requireString(c.req.query("session_id"), "session_id", 256);
  await c.env.CACHE.delete(wkey(c.get("apiKey").id, session));
  return c.json({ session_id: session, cleared: true });
});

export default working;
