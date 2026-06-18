import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { episodeId, eventId } from "../lib/ids";
import { requireScope } from "../middleware/auth";
import { summarize } from "../lib/ai";

// Episodic memory — ordered sessions of events an agent can replay.
const episodes = new Hono<{ Bindings: Env; Variables: Variables }>();

/** POST /memory/episodes/start — begin a session episode. */
episodes.post("/start", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const agentId = requireString(body.agent_id, "agent_id", 256);
  const userId = body.user_id == null ? null : requireString(body.user_id, "user_id", 256);
  const title = body.title == null ? null : requireString(body.title, "title", 500);
  const id = episodeId();
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO episodes (id, api_key_id, agent_id, user_id, title, status, event_count, started_at)
     VALUES (?, ?, ?, ?, ?, 'open', 0, ?)`,
  )
    .bind(id, c.get("apiKey").id, agentId, userId, title, now)
    .run();

  return c.json({ id, agent_id: agentId, user_id: userId, title, status: "open", started_at: now }, 201);
});

/** POST /memory/episodes/event — append an event to an open episode. */
episodes.post("/event", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const episode = requireString(body.episode_id, "episode_id", 64);
  const content = requireString(body.content, "content", 20000);
  const type = body.type == null ? "event" : requireString(body.type, "type", 64);
  const keyId = c.get("apiKey").id;

  const ep = await c.env.DB.prepare(
    `SELECT status, event_count FROM episodes WHERE id = ? AND api_key_id = ?`,
  )
    .bind(episode, keyId)
    .first<{ status: string; event_count: number }>();
  if (!ep) fail(404, "episode not found");
  if (ep!.status !== "open") fail(409, "episode is closed", "episode_closed");

  const seq = ep!.event_count + 1;
  const id = eventId();
  const now = Date.now();

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO episode_events (id, episode_id, api_key_id, seq, type, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, episode, keyId, seq, type, content, now),
    c.env.DB.prepare(`UPDATE episodes SET event_count = ? WHERE id = ?`).bind(seq, episode),
  ]);

  return c.json({ id, episode_id: episode, seq, type, created_at: now }, 201);
});

/** POST /memory/episodes/end — close an episode, auto-summarizing if needed. */
episodes.post("/end", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const episode = requireString(body.episode_id, "episode_id", 64);
  const keyId = c.get("apiKey").id;

  const ep = await c.env.DB.prepare(
    `SELECT status FROM episodes WHERE id = ? AND api_key_id = ?`,
  )
    .bind(episode, keyId)
    .first<{ status: string }>();
  if (!ep) fail(404, "episode not found");

  let summary = body.summary == null ? null : requireString(body.summary, "summary", 5000);
  let auto = false;
  if (!summary) {
    const { results } = await c.env.DB.prepare(
      `SELECT seq, type, content FROM episode_events WHERE episode_id = ? ORDER BY seq`,
    )
      .bind(episode)
      .all<{ seq: number; type: string; content: string }>();
    const transcript = (results ?? []).map((e) => `${e.seq}. [${e.type}] ${e.content}`).join("\n");
    if (transcript) {
      summary = await summarize(
        c.env,
        "Summarize this agent session episode in 2-4 sentences. Capture what happened, key facts, and outcomes.",
        transcript,
      );
      auto = true;
    }
  }

  const now = Date.now();
  await c.env.DB.prepare(
    `UPDATE episodes SET status = 'closed', summary = ?, ended_at = ? WHERE id = ?`,
  )
    .bind(summary, now, episode)
    .run();

  return c.json({ id: episode, status: "closed", summary, auto_summarized: auto, ended_at: now });
});

/** GET /memory/episodes — list episodes, or one full episode (with events) by id. */
episodes.get("/", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const id = c.req.query("id");

  if (id) {
    const ep = await c.env.DB.prepare(
      `SELECT id, agent_id, user_id, title, status, summary, event_count, started_at, ended_at
       FROM episodes WHERE id = ? AND api_key_id = ?`,
    )
      .bind(id, keyId)
      .first();
    if (!ep) fail(404, "episode not found");
    const { results } = await c.env.DB.prepare(
      `SELECT id, seq, type, content, created_at FROM episode_events WHERE episode_id = ? ORDER BY seq`,
    )
      .bind(id)
      .all();
    return c.json({ ...ep, events: results ?? [] });
  }

  const agentId = c.req.query("agent_id");
  const userId = c.req.query("user_id");
  const limit = parseLimit(c.req.query("limit"), 20, 100);
  const conds = ["api_key_id = ?"];
  const binds: unknown[] = [keyId];
  if (agentId) { conds.push("agent_id = ?"); binds.push(agentId); }
  if (userId) { conds.push("user_id = ?"); binds.push(userId); }

  const { results } = await c.env.DB.prepare(
    `SELECT id, agent_id, user_id, title, status, summary, event_count, started_at, ended_at
     FROM episodes WHERE ${conds.join(" AND ")} ORDER BY started_at DESC LIMIT ?`,
  )
    .bind(...binds, limit)
    .all();

  return c.json({ count: results?.length ?? 0, episodes: results ?? [] });
});

export default episodes;
