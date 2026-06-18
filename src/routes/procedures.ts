import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { procedureId } from "../lib/ids";
import { requireScope } from "../middleware/auth";
import { embed, cosineSimilarity } from "../lib/embeddings";

// Procedural memory — how to do things (ordered steps), matched semantically.
const procedures = new Hono<{ Bindings: Env; Variables: Variables }>();

/** POST /memory/procedures — store a procedure. */
procedures.post("/", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const agentId = requireString(body.agent_id, "agent_id", 256);
  const name = requireString(body.name, "name", 500);
  const description = body.description == null ? null : requireString(body.description, "description", 5000);
  const trigger = body.trigger == null ? null : requireString(body.trigger, "trigger", 1000);

  if (!Array.isArray(body.steps) || body.steps.some((s) => typeof s !== "string")) {
    fail(400, "'steps' must be an array of strings");
  }
  const steps = body.steps as string[];

  const id = procedureId();
  const now = Date.now();

  // Embed name + trigger + description for matching.
  let embedding: string | null = null;
  try {
    const r = await embed(c.env, [name, trigger ?? "", description ?? ""].join(". "));
    embedding = JSON.stringify(r.vector);
  } catch (err) {
    console.error("procedure embed failed", String(err));
  }

  await c.env.DB.prepare(
    `INSERT INTO procedures (id, api_key_id, agent_id, name, description, steps, trigger, embedding, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, c.get("apiKey").id, agentId, name, description, JSON.stringify(steps), trigger, embedding, now)
    .run();

  return c.json({ id, agent_id: agentId, name, description, steps, trigger, created_at: now }, 201);
});

/** GET /memory/procedures/match — find the most relevant procedure for a task. */
procedures.get("/match", requireScope("read"), async (c) => {
  const query = requireString(c.req.query("q"), "q", 4000);
  const agentId = c.req.query("agent_id");
  const limit = parseLimit(c.req.query("limit"), 3, 20);
  const keyId = c.get("apiKey").id;

  let queryVec: number[] | null = null;
  try {
    queryVec = (await embed(c.env, query)).vector;
  } catch (err) {
    console.error("match embed failed", String(err));
  }

  const where = agentId ? `api_key_id = ? AND agent_id = ?` : `api_key_id = ?`;
  const binds = agentId ? [keyId, agentId] : [keyId];
  const { results } = await c.env.DB.prepare(
    `SELECT id, agent_id, name, description, steps, trigger, embedding FROM procedures WHERE ${where} LIMIT 500`,
  )
    .bind(...binds)
    .all<{ id: string; agent_id: string; name: string; description: string | null; steps: string; trigger: string | null; embedding: string | null }>();

  const ranked = (results ?? [])
    .map((row) => {
      let score = 0;
      if (queryVec && row.embedding) {
        try {
          score = cosineSimilarity(queryVec, JSON.parse(row.embedding) as number[]);
        } catch {
          score = 0;
        }
      }
      return {
        id: row.id,
        agent_id: row.agent_id,
        name: row.name,
        description: row.description,
        trigger: row.trigger,
        steps: safeArr(row.steps),
        score: queryVec ? Number(score.toFixed(6)) : null,
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);

  return c.json({ query, semantic: queryVec !== null, count: ranked.length, procedures: ranked });
});

function safeArr(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

export default procedures;
