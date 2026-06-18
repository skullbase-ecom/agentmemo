import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireScope } from "../middleware/auth";

// GDPR endpoints — right to data portability and right to be forgotten, scoped
// to the calling API key.
const users = new Hono<{ Bindings: Env; Variables: Variables }>();

/** GET /users/:id/memories — export everything stored about a user. */
users.get("/:id/memories", requireScope("read"), async (c) => {
  const userId = c.req.param("id");
  const keyId = c.get("apiKey").id;

  const memories = await c.env.DB.prepare(
    `SELECT id, agent_id, content, metadata, tags, created_at FROM memories
     WHERE api_key_id = ? AND user_id = ? ORDER BY created_at`,
  )
    .bind(keyId, userId)
    .all();
  const emotional = await c.env.DB.prepare(
    `SELECT id, agent_id, sentiment, intensity, note, created_at FROM emotional_memories
     WHERE api_key_id = ? AND user_id = ? ORDER BY created_at`,
  )
    .bind(keyId, userId)
    .all();
  const episodes = await c.env.DB.prepare(
    `SELECT id, agent_id, title, status, summary, started_at FROM episodes
     WHERE api_key_id = ? AND user_id = ? ORDER BY started_at`,
  )
    .bind(keyId, userId)
    .all();

  return c.json({
    user_id: userId,
    format: "agentmemo.gdpr.export.v1",
    memories: memories.results ?? [],
    emotional_memories: emotional.results ?? [],
    episodes: episodes.results ?? [],
  });
});

/** DELETE /users/:id/memories — forget everything about a user (right to be forgotten). */
users.delete("/:id/memories", requireScope("write"), async (c) => {
  const userId = c.req.param("id");
  const keyId = c.get("apiKey").id;

  const res = await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM memories WHERE api_key_id = ? AND user_id = ?`).bind(keyId, userId),
    c.env.DB.prepare(`DELETE FROM emotional_memories WHERE api_key_id = ? AND user_id = ?`).bind(keyId, userId),
    c.env.DB.prepare(`DELETE FROM episodes WHERE api_key_id = ? AND user_id = ?`).bind(keyId, userId),
  ]);

  const deleted = res.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
  return c.json({ user_id: userId, forgotten: true, rows_deleted: deleted });
});

export default users;
