import { shell } from "./ui";

// Machine-readable API discovery documents (Section 5 — agent readiness).
//   GET /openapi.json                          OpenAPI 3.0 spec
//   GET /.well-known/api-catalog               RFC 9727 linkset
//   GET /.well-known/agent-skills/index.json   Agent Skills Discovery v0.2.0
//   GET /.well-known/mcp/server-card.json      MCP server card

const BASE = "https://agentmemo.dev";

const bearer = [{ bearerAuth: [] }];
const okJson = { description: "Success", content: { "application/json": {} } };

function op(summary: string, extra: Record<string, unknown> = {}) {
  return { summary, security: bearer, responses: { "200": okJson, "201": okJson }, ...extra };
}

export const OPENAPI = {
  openapi: "3.0.3",
  info: {
    title: "AgentMemo API",
    version: "1.0.0",
    description: "Persistent memory infrastructure for AI agents — semantic, episodic, procedural, working, and emotional memory.",
    contact: { name: "AgentMemo", url: BASE },
  },
  servers: [{ url: BASE }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "am_sk" },
    },
  },
  paths: {
    "/signup": { post: { summary: "Self-serve: create a free API key", responses: { "201": okJson } } },
    "/usage": { get: op("Usage + quota for the calling key") },
    "/health": { get: { summary: "Health check", responses: { "200": okJson } } },
    "/memory/store": {
      post: op("Store a memory (semantic). Supports importance, ttl_seconds, tags, namespace, outcome, detect_conflicts."),
    },
    "/memory/retrieve": { get: op("Semantic search with composite scoring + filters") },
    "/memory/forget": { delete: op("Delete a memory by id or scope") },
    "/memory/context": { get: op("Memories formatted for LLM system-prompt injection") },
    "/memory/batch": { post: op("Store up to 100 memories") },
    "/memory/feedback": { post: op("Update a memory's outcome (EMA)") },
    "/memory/stale": { get: op("Memories not verified in 30+ days") },
    "/memory/verify/{id}": { post: op("Mark a memory still valid") },
    "/memory/stats": { get: op("Comprehensive memory statistics + quality score") },
    "/memory/conflicts": { get: op("List detected contradictions") },
    "/memory/timeline": { get: op("Fact evolution over time for a topic") },
    "/memory/expired": { delete: op("Delete all expired memories") },
    "/memory/compress": { post: op("Summarize/merge old memories") },
    "/memory/export": { get: op("Export memories (json/markdown)") },
    "/memory/import": { post: op("Import memories") },
    "/memory/episodes/start": { post: op("Begin a session episode") },
    "/memory/episodes/event": { post: op("Append an event to an episode") },
    "/memory/episodes/end": { post: op("Close + auto-summarize an episode") },
    "/memory/episodes": { get: op("List/replay episodes") },
    "/memory/procedures": { post: op("Store a procedure") },
    "/memory/procedures/match": { get: op("Find a procedure for a task") },
    "/memory/working": { post: op("Store working memory"), get: op("Get working memory"), delete: op("Clear working memory") },
    "/memory/emotional": { post: op("Record interaction sentiment") },
    "/memory/emotional/profile": { get: op("User emotional profile + trust score") },
    "/memory/graph/link": { post: op("Link two memories") },
    "/memory/graph/explore": { get: op("Traverse the memory graph") },
    "/memory/graph/conflicts": { get: op("Contradicting memory pairs") },
    "/memory/health": { get: op("Memory quality report") },
    "/memory/insights": { get: op("Surfaced insights") },
    "/memory/predict": { get: op("Predicted likely-needed memories") },
    "/memory/transfer": { post: op("Transfer memories between agents") },
    "/memory/subscribe": { post: op("Subscribe to memory events") },
    "/agents/register": { post: op("Register a named agent") },
    "/agents/{id}": { get: op("Agent profile") },
    "/agents/{id}/memories": { get: op("Agent memories") },
    "/agents/{id}/stats": { get: op("Agent stats") },
    "/analytics/daily": { get: op("Daily usage") },
    "/analytics/agents": { get: op("Per-agent usage") },
    "/analytics/patterns": { get: op("Access patterns") },
    "/users/{id}/memories": { get: op("GDPR export"), delete: op("GDPR forget") },
    "/templates": { get: op("List memory templates") },
    "/mcp": { post: { summary: "MCP JSON-RPC endpoint", security: bearer, responses: { "200": okJson } } },
  },
} as const;

export const API_CATALOG = {
  linkset: [
    {
      anchor: `${BASE}/`,
      "service-desc": [{ href: `${BASE}/openapi.json`, type: "application/json" }],
      "service-doc": [{ href: `${BASE}/docs`, type: "text/html" }],
      "auth-policy": [{ href: `${BASE}/auth.md`, type: "text/markdown" }],
      status: [{ href: `${BASE}/status.json`, type: "application/json" }],
      "agent-card": [{ href: `${BASE}/agent-card.json`, type: "application/json" }],
    },
  ],
};

export const AGENT_SKILLS = {
  $schema: "https://agentskills.dev/schema/v0.2.0.json",
  version: "0.2.0",
  provider: { name: "AgentMemo", url: BASE },
  skills: [
    { name: "store_memory", type: "write", description: "Store a memory for a user/agent.", url: `${BASE}/memory/store`, method: "POST" },
    { name: "retrieve_memory", type: "read", description: "Semantic search over memories.", url: `${BASE}/memory/retrieve`, method: "GET" },
    { name: "get_context", type: "read", description: "Memories formatted for LLM injection.", url: `${BASE}/memory/context`, method: "GET" },
    { name: "forget_memory", type: "write", description: "Delete memories.", url: `${BASE}/memory/forget`, method: "DELETE" },
    { name: "give_feedback", type: "write", description: "Update memory outcome.", url: `${BASE}/memory/feedback`, method: "POST" },
    { name: "get_stats", type: "read", description: "Memory statistics.", url: `${BASE}/memory/stats`, method: "GET" },
  ],
};

export const MCP_SERVER_CARD = {
  schemaVersion: "1.0",
  serverInfo: { name: "AgentMemo", version: "1.0.0", description: "Persistent memory for AI agents" },
  transport: { type: "streamable-http", endpoint: `${BASE}/mcp` },
  authentication: { type: "bearer", obtain: `${BASE}/signup` },
  capabilities: { tools: true, resources: false, prompts: false },
  tools: [
    { name: "store_memory", description: "Store a memory for a user/agent." },
    { name: "retrieve_memory", description: "Semantic search over a user's memories." },
    { name: "get_context", description: "Get memories formatted for LLM context injection." },
    { name: "forget_memory", description: "Delete a memory or scope." },
    { name: "give_feedback", description: "Update a memory's outcome." },
    { name: "get_stats", description: "Memory statistics." },
    { name: "get_usage", description: "Usage for the calling key." },
  ],
};

// ---- Human-readable API explorer (/api-explorer) ------------------------
function explorerCategory(path: string): string {
  if (path.startsWith("/memory")) return "Memory";
  if (path.startsWith("/agents")) return "Agents";
  if (path.startsWith("/analytics")) return "Analytics";
  if (path.startsWith("/users")) return "Security & GDPR";
  if (path.startsWith("/webhooks")) return "Webhooks";
  if (path.startsWith("/mcp")) return "Discovery";
  return "Auth & Account";
}
const EXPLORER_ORDER = ["Memory", "Agents", "Analytics", "Auth & Account", "Security & GDPR", "Discovery", "Webhooks"];

function buildExplorer(): string {
  const groups: Record<string, { method: string; path: string; summary: string }[]> = {};
  for (const [path, opsRaw] of Object.entries(OPENAPI.paths as Record<string, Record<string, { summary?: string }>>)) {
    for (const m of ["get", "post", "delete", "put", "patch"]) {
      const op = opsRaw[m];
      if (!op) continue;
      const cat = explorerCategory(path);
      (groups[cat] ||= []).push({ method: m.toUpperCase(), path, summary: op.summary ?? "" });
    }
  }
  return EXPLORER_ORDER.filter((c) => groups[c])
    .map((c) => {
      const rows = groups[c]
        .map(
          (r) =>
            `<div class="ep"><span class="mb ${r.method}">${r.method}</span><span class="ep-path">${r.path}</span><span class="ep-sum">${r.summary}</span></div>`,
        )
        .join("");
      return `<details open><summary>${c} <span class="cnt">${groups[c].length}</span></summary>${rows}</details>`;
    })
    .join("");
}

const EXPLORER_STYLE = `<style>
.exh{padding:56px 0 8px;text-align:center}
.exh h1{font-size:clamp(2rem,5vw,3rem);font-weight:800}
.exh p{color:var(--text-2);margin-top:12px}
.exwrap{max-width:880px;margin:32px auto 0;padding:0 24px}
details{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden}
summary{padding:14px 18px;font-weight:600;color:var(--text);cursor:pointer;font-size:15px;list-style:none}
summary::-webkit-details-marker{display:none}
summary::before{content:"▸";color:var(--accent);margin-right:10px;display:inline-block;transition:transform .15s}
details[open] summary::before{transform:rotate(90deg)}
.cnt{color:var(--text-muted);font-weight:500;font-size:13px}
.ep{display:flex;align-items:center;gap:14px;padding:11px 18px;border-top:1px solid var(--border);flex-wrap:wrap}
.mb{font-family:var(--mono);font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;min-width:62px;text-align:center}
.mb.GET{background:#22c55e;color:#000}
.mb.POST{background:#8b5cf6;color:#fff}
.mb.DELETE{background:#ef4444;color:#fff}
.mb.PUT,.mb.PATCH{background:#f59e0b;color:#000}
.ep-path{font-family:var(--mono);color:var(--text);font-size:13.5px}
.ep-sum{color:var(--text-2);font-size:13px;flex:1;min-width:200px}
.exnote{max-width:880px;margin:24px auto 0;padding:0 24px;color:var(--text-muted);font-size:13px}
</style>`;

export const API_EXPLORER_HTML = shell({
  title: "API Explorer — AgentMemo",
  description: "Browse the full AgentMemo API — every endpoint, organized by category, in a clean human-readable view.",
  path: "/api-explorer",
  body: `${EXPLORER_STYLE}
<div class="exh"><span class="eyebrow">Reference</span><h1>API <span class="accent-text">Explorer</span></h1><p>Every endpoint, organized by category. Machine-readable spec at <a href="/openapi.json">/openapi.json</a>.</p></div>
<div class="exwrap">${buildExplorer()}</div>
<p class="exnote">Authenticate with <span class="mono">Authorization: Bearer am_sk_...</span>. Full docs at <a href="/docs">/docs</a>.</p>`,
});
