import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { agentRegId } from "../lib/ids";
import { requireScope } from "../middleware/auth";

// Agent identity — agents as first-class citizens under an API key. A registered
// agent's `name` is the `agent_id` used in /memory calls, so one key can manage
// many named agents.
const agents = new Hono<{ Bindings: Env; Variables: Variables }>();

/** POST /agents/register — register a named agent. */
agents.post("/register", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const name = requireString(body.name, "name", 256);
  const description = body.description == null ? null : requireString(body.description, "description", 2000);
  let capabilities = "[]";
  if (body.capabilities !== undefined) {
    if (!Array.isArray(body.capabilities) || body.capabilities.some((x) => typeof x !== "string")) {
      fail(400, "'capabilities' must be an array of strings");
    }
    capabilities = JSON.stringify(body.capabilities);
  }
  const id = agentRegId();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO agents (id, api_key_id, name, description, capabilities, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, c.get("apiKey").id, name, description, capabilities, now)
    .run();
  return c.json({ id, name, description, capabilities: JSON.parse(capabilities), agent_id: name, created_at: now }, 201);
});

async function loadAgent(c: { env: Env; get: (k: "apiKey") => { id: string } }, id: string) {
  return c.env.DB.prepare(
    `SELECT id, name, description, capabilities, created_at FROM agents WHERE id = ? AND api_key_id = ?`,
  )
    .bind(id, c.get("apiKey").id)
    .first<{ id: string; name: string; description: string | null; capabilities: string; created_at: number }>();
}

/** GET /agents/:id — agent profile. */
agents.get("/:id", requireScope("read"), async (c) => {
  const a = await loadAgent(c, c.req.param("id"));
  if (!a) fail(404, "agent not found");
  return c.json({ ...a!, capabilities: safe(a!.capabilities), agent_id: a!.name });
});

/** GET /agents/:id/memories — memories stored under this agent. */
agents.get("/:id/memories", requireScope("read"), async (c) => {
  const a = await loadAgent(c, c.req.param("id"));
  if (!a) fail(404, "agent not found");
  const limit = parseLimit(c.req.query("limit"), 50, 200);
  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, content, importance, tags, created_at FROM memories
     WHERE api_key_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(c.get("apiKey").id, a!.name, limit)
    .all();
  return c.json({ agent_id: a!.name, count: results?.length ?? 0, memories: results ?? [] });
});

/** GET /agents/:id/stats — memory + activity stats for this agent. */
agents.get("/:id/stats", requireScope("read"), async (c) => {
  const a = await loadAgent(c, c.req.param("id"));
  if (!a) fail(404, "agent not found");
  const keyId = c.get("apiKey").id;
  const one = async (sql: string) =>
    (await c.env.DB.prepare(sql).bind(keyId, a!.name).first<{ n: number }>())?.n ?? 0;

  const [memories, episodes, procedures, emotions, lastRow] = await Promise.all([
    one(`SELECT COUNT(*) AS n FROM memories WHERE api_key_id = ? AND agent_id = ?`),
    one(`SELECT COUNT(*) AS n FROM episodes WHERE api_key_id = ? AND agent_id = ?`),
    one(`SELECT COUNT(*) AS n FROM procedures WHERE api_key_id = ? AND agent_id = ?`),
    one(`SELECT COUNT(*) AS n FROM emotional_memories WHERE api_key_id = ? AND agent_id = ?`),
    c.env.DB.prepare(`SELECT MAX(created_at) AS n FROM memories WHERE api_key_id = ? AND agent_id = ?`)
      .bind(keyId, a!.name)
      .first<{ n: number | null }>(),
  ]);

  return c.json({
    agent_id: a!.name,
    memories,
    episodes,
    procedures,
    emotional_memories: emotions,
    last_activity: lastRow?.n ?? null,
  });
});

function safe(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

export default agents;
