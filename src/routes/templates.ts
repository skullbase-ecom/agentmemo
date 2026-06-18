import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail } from "../lib/http";
import { requireScope } from "../middleware/auth";

// Memory templates — recommended memory structures for common agent types.
const templates = new Hono<{ Bindings: Env; Variables: Variables }>();

const TEMPLATES: Record<string, { name: string; description: string; tags: string[]; namespaces: string[]; recommended_memory_types: string[] }> = {
  "customer-service-agent": {
    name: "Customer Service Agent",
    description: "Remember customer history, preferences, and sentiment across tickets.",
    tags: ["account", "issue", "preference", "resolution"],
    namespaces: ["profile", "tickets", "sentiment"],
    recommended_memory_types: ["semantic", "emotional", "episodic"],
  },
  "coding-agent": {
    name: "Coding Agent",
    description: "Remember codebase facts, conventions, and how-to procedures.",
    tags: ["architecture", "convention", "bug", "dependency"],
    namespaces: ["repo", "decisions", "procedures"],
    recommended_memory_types: ["semantic", "procedural", "working"],
  },
  "research-agent": {
    name: "Research Agent",
    description: "Accumulate findings and link supporting/contradicting evidence.",
    tags: ["source", "finding", "claim", "citation"],
    namespaces: ["sources", "findings"],
    recommended_memory_types: ["semantic", "episodic"],
  },
  "sales-agent": {
    name: "Sales Agent",
    description: "Track leads, deal stage, objections, and rapport over time.",
    tags: ["lead", "stage", "objection", "rapport"],
    namespaces: ["leads", "deals", "sentiment"],
    recommended_memory_types: ["semantic", "emotional", "episodic"],
  },
};

/** GET /templates — list available templates. */
templates.get("/", requireScope("read"), (c) =>
  c.json({ templates: Object.entries(TEMPLATES).map(([id, t]) => ({ id, ...t })) }),
);

/** POST /templates/:id/apply — get the recommended structure to apply for an agent. */
templates.post("/:id/apply", requireScope("write"), async (c) => {
  const id = c.req.param("id");
  const tpl = TEMPLATES[id];
  if (!tpl) fail(404, "template not found");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  return c.json({
    applied: true,
    template_id: id,
    agent_id: body.agent_id ?? null,
    structure: tpl,
    next: "Use these tags and namespaces when calling /memory/store.",
  });
});

export default templates;
