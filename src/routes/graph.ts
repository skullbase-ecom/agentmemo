import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString, parseLimit } from "../lib/http";
import { linkId } from "../lib/ids";
import { requireScope } from "../middleware/auth";

// Memory graph — typed links between memories, traversable like a knowledge graph.
const graph = new Hono<{ Bindings: Env; Variables: Variables }>();

const RELATIONSHIPS = new Set(["contradicts", "supports", "follows", "causes", "related_to"]);

/** POST /memory/graph/link — link two memories with a relationship type. */
graph.post("/link", requireScope("write"), async (c) => {
  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as Record<string, unknown>;
  const from = requireString(body.from ?? body.memory_a, "from", 64);
  const to = requireString(body.to ?? body.memory_b, "to", 64);
  const rel = requireString(body.relationship, "relationship", 32);
  if (!RELATIONSHIPS.has(rel)) {
    fail(400, `'relationship' must be one of: ${[...RELATIONSHIPS].join(", ")}`);
  }
  const keyId = c.get("apiKey").id;

  // Both memories must belong to this key.
  const found = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM memories WHERE api_key_id = ? AND id IN (?, ?)`,
  )
    .bind(keyId, from, to)
    .first<{ n: number }>();
  if ((found?.n ?? 0) < 2) fail(404, "both 'from' and 'to' memories must exist for this key");

  const id = linkId();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO memory_links (id, api_key_id, from_id, to_id, relationship, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, keyId, from, to, rel, now)
    .run();

  return c.json({ id, from, to, relationship: rel, created_at: now }, 201);
});

/** GET /memory/graph/explore — traverse the graph from a starting memory (BFS, bounded depth). */
graph.get("/explore", requireScope("read"), async (c) => {
  const start = requireString(c.req.query("id"), "id", 64);
  const depth = Math.min(parseLimit(c.req.query("depth"), 2, 4), 4);
  const keyId = c.get("apiKey").id;

  const visited = new Set<string>([start]);
  const nodes = new Map<string, unknown>();
  const edges: { from: string; to: string; relationship: string }[] = [];
  let frontier = [start];

  for (let d = 0; d < depth && frontier.length; d++) {
    const placeholders = frontier.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
      `SELECT from_id, to_id, relationship FROM memory_links
       WHERE api_key_id = ? AND (from_id IN (${placeholders}) OR to_id IN (${placeholders}))`,
    )
      .bind(keyId, ...frontier, ...frontier)
      .all<{ from_id: string; to_id: string; relationship: string }>();

    const next: string[] = [];
    for (const e of results ?? []) {
      edges.push({ from: e.from_id, to: e.to_id, relationship: e.relationship });
      for (const n of [e.from_id, e.to_id]) {
        if (!visited.has(n)) {
          visited.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }

  // Hydrate node contents.
  const ids = [...visited];
  if (ids.length) {
    const { results } = await c.env.DB.prepare(
      `SELECT id, content, metadata FROM memories WHERE api_key_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
    )
      .bind(keyId, ...ids)
      .all<{ id: string; content: string; metadata: string }>();
    for (const r of results ?? []) nodes.set(r.id, { id: r.id, content: r.content });
  }

  // Dedupe edges.
  const seen = new Set<string>();
  const uniqueEdges = edges.filter((e) => {
    const k = `${e.from}|${e.to}|${e.relationship}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return c.json({ start, depth, nodes: [...nodes.values()], edges: uniqueEdges });
});

/** GET /memory/graph/conflicts — surface contradicting memory pairs. */
graph.get("/conflicts", requireScope("read"), async (c) => {
  const keyId = c.get("apiKey").id;
  const limit = parseLimit(c.req.query("limit"), 50, 200);
  const { results } = await c.env.DB.prepare(
    `SELECT l.id, l.from_id, l.to_id, l.created_at,
            a.content AS from_content, b.content AS to_content
     FROM memory_links l
     LEFT JOIN memories a ON a.id = l.from_id
     LEFT JOIN memories b ON b.id = l.to_id
     WHERE l.api_key_id = ? AND l.relationship = 'contradicts'
     ORDER BY l.created_at DESC LIMIT ?`,
  )
    .bind(keyId, limit)
    .all();
  return c.json({ count: results?.length ?? 0, conflicts: results ?? [] });
});

export default graph;
