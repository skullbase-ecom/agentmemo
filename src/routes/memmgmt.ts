import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { memoryId } from "../lib/ids";
import { requireScope } from "../middleware/auth";
import { embed } from "../lib/embeddings";
import { summarize } from "../lib/ai";

// Memory management — portability (export/import) and compression.
const memmgmt = new Hono<{ Bindings: Env; Variables: Variables }>();

/** GET /memory/export — export memories as JSON or Markdown. */
memmgmt.get("/export", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = c.req.query("user_id");
  const agentId = c.req.query("agent_id");
  const format = (c.req.query("format") ?? "json").toLowerCase();

  const conds = ["api_key_id = ?"];
  const binds: unknown[] = [keyId];
  if (userId) { conds.push("user_id = ?"); binds.push(userId); }
  if (agentId) { conds.push("agent_id = ?"); binds.push(agentId); }

  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, agent_id, content, metadata, importance, tags, created_at
     FROM memories WHERE ${conds.join(" AND ")} ORDER BY created_at`,
  )
    .bind(...binds)
    .all<{ id: string; user_id: string; agent_id: string; content: string; metadata: string; importance: number; tags: string | null; created_at: number }>();

  const memories = (results ?? []).map((r) => ({
    id: r.id, user_id: r.user_id, agent_id: r.agent_id, content: r.content,
    metadata: safe(r.metadata), importance: r.importance, tags: r.tags ? r.tags.split(",") : [],
    created_at: r.created_at,
  }));

  if (format === "markdown" || format === "md") {
    const md =
      `# AgentMemo export\n\n_${memories.length} memories_\n\n` +
      memories
        .map((m) => `- **${m.agent_id}** / ${m.user_id}: ${m.content}` + (m.tags.length ? ` _(${m.tags.join(", ")})_` : ""))
        .join("\n");
    c.header("content-type", "text/markdown; charset=utf-8");
    return c.body(md);
  }

  return c.json({ format: "agentmemo.export.v1", count: memories.length, memories });
});

/** POST /memory/import — import memories (from another agent or platform). */
memmgmt.post("/import", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  if (!Array.isArray(body.memories)) fail(400, "'memories' must be an array");
  const defUser = body.user_id == null ? null : String(body.user_id);
  const defAgent = body.agent_id == null ? null : String(body.agent_id);
  const items = body.memories as Record<string, unknown>[];
  if (items.length === 0) fail(400, "'memories' must not be empty");
  if (items.length > 500) fail(400, "import is limited to 500 memories per request");

  const keyId = c.get("apiKey").id;
  let imported = 0;
  const now = Date.now();

  for (const m of items) {
    const content = typeof m.content === "string" ? m.content : null;
    const userId = (m.user_id as string) ?? defUser;
    const agentId = (m.agent_id as string) ?? defAgent;
    if (!content || !userId || !agentId) continue;

    let embedding: string | null = null;
    try {
      embedding = JSON.stringify((await embed(c.env, content)).vector);
    } catch { /* store unembedded */ }

    const meta = m.metadata && typeof m.metadata === "object" ? JSON.stringify(m.metadata) : "{}";
    const tags = Array.isArray(m.tags) ? (m.tags as string[]).join(",") : null;
    await c.env.DB.prepare(
      `INSERT INTO memories (id, api_key_id, user_id, agent_id, content, metadata, embedding, importance, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    )
      .bind(memoryId(), keyId, userId, agentId, content, meta, embedding, tags, now, now)
      .run();
    imported++;
  }

  return c.json({ imported, skipped: items.length - imported }, 201);
});

/** GET /memory/compression/preview — what would be compressed (no changes). */
memmgmt.get("/compression/preview", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const userId = requireString(c.req.query("user_id"), "user_id", 256);
  const agentId = c.req.query("agent_id");
  const keep = parseLimit(c.req.query("keep"), 50, 1000); // keep most-recent N

  const where = agentId ? `api_key_id = ? AND user_id = ? AND agent_id = ?` : `api_key_id = ? AND user_id = ?`;
  const binds = agentId ? [keyId, userId, agentId] : [keyId, userId];
  const total = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM memories WHERE ${where}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const candidates = Math.max(0, total - keep);

  return c.json({
    user_id: userId,
    agent_id: agentId ?? null,
    total_memories: total,
    would_compress: candidates,
    would_keep_recent: Math.min(total, keep),
    auto_trigger_threshold: 1000,
  });
});

/** POST /memory/compress — summarize/merge the oldest memories into one. */
memmgmt.post("/compress", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const userId = requireString(body.user_id, "user_id", 256);
  const agentId = requireString(body.agent_id, "agent_id", 256);
  const keep = body.keep == null ? 50 : Math.max(0, Number(body.keep) || 50);
  const deleteOriginals = body.delete_originals !== false; // default true
  const keyId = c.get("apiKey").id;

  const { results } = await c.env.DB.prepare(
    `SELECT id, content FROM memories WHERE api_key_id = ? AND user_id = ? AND agent_id = ?
     ORDER BY created_at ASC`,
  )
    .bind(keyId, userId, agentId)
    .all<{ id: string; content: string }>();
  const all = results ?? [];
  const toCompress = all.slice(0, Math.max(0, all.length - keep));
  if (toCompress.length < 2) {
    return c.json({ compressed: 0, message: "not enough old memories to compress" });
  }

  const transcript = toCompress.map((m, i) => `${i + 1}. ${m.content}`).join("\n");
  const summary = await summarize(
    c.env,
    "Merge these agent memories into a concise set of durable facts. Keep all distinct information; drop redundancy.",
    transcript,
  );

  const now = Date.now();
  const id = memoryId();
  let embedding: string | null = null;
  try {
    embedding = JSON.stringify((await embed(c.env, summary)).vector);
  } catch { /* ignore */ }

  const statements = [
    c.env.DB.prepare(
      `INSERT INTO memories (id, api_key_id, user_id, agent_id, content, metadata, embedding, importance, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 5, 'compressed', ?, ?)`,
    ).bind(id, keyId, userId, agentId, summary, JSON.stringify({ compressed_from: toCompress.length }), embedding, now, now),
  ];
  if (deleteOriginals) {
    const ids = toCompress.map((m) => m.id);
    statements.push(
      c.env.DB.prepare(
        `DELETE FROM memories WHERE api_key_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
      ).bind(keyId, ...ids),
    );
  }
  await c.env.DB.batch(statements);

  return c.json({
    compressed: toCompress.length,
    kept_recent: Math.min(all.length, keep),
    deleted_originals: deleteOriginals,
    compressed_memory_id: id,
    summary,
  });
});

function safe(s: string): unknown {
  try { return JSON.parse(s); } catch { return {}; }
}

export default memmgmt;
