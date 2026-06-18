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
