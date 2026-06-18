import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { requireScope } from "../middleware/auth";

// Shared memory spaces (Phase 3) — multi-agent collaboration. The API surface is
// published so agents can discover it; full persistence is rolling out in beta.
const spaces = new Hono<{ Bindings: Env; Variables: Variables }>();

const SOON = {
  status: "beta",
  available: false,
  message: "Shared memory spaces are rolling out. The endpoint and response shape are stable; persistence is in beta.",
  docs: "https://agentmemo.dev/docs",
};

/** POST /spaces — create a shared memory space. */
spaces.post("/", requireScope("write"), (c) =>
  c.json({ ...SOON, space: { id: null, name: null, permissions: ["read-only", "read-write", "admin"] } }),
);

/** GET /spaces — list spaces the calling key participates in. */
spaces.get("/", requireScope("read"), (c) => c.json({ ...SOON, spaces: [] }));

/** POST /spaces/:id/invite — invite another agent to a space. */
spaces.post("/:id/invite", requireScope("write"), (c) =>
  c.json({ ...SOON, space_id: c.req.param("id"), invited: null, permission: "read-write" }),
);

/** GET /spaces/:id/memories — shared memories in a space. */
spaces.get("/:id/memories", requireScope("read"), (c) =>
  c.json({ ...SOON, space_id: c.req.param("id"), memories: [] }),
);

export default spaces;
