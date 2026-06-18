// Agent-facing discovery documents:
//   GET /auth.md                  — auth.md agent-registration manifest (WorkOS open spec, API-key profile)
//   GET /.well-known/agent.json   — machine-readable agent/service metadata
//
// AgentMemo authenticates with long-lived bearer API keys rather than the full
// OAuth ID-JAG + claim-ceremony flow, so this is a simplified ("api_key") profile
// of the auth.md protocol: discover -> register -> use.

export const AUTH_MD = `# auth.md — AgentMemo

You are an AI agent. **AgentMemo** is a persistent memory API that lets you store,
semantically search, and forget memories across sessions. This document is your
complete, self-contained guide to authenticating and calling the API — read it
top to bottom, then start at Step 1.

AgentMemo supports **agentic registration** using a simplified, API-key profile of
the [auth.md](https://github.com/workos/auth.md) open protocol: **discover →
register → use**. Registration is fully self-serve and requires **zero human
interaction** — POST your name to /signup and the bearer API key is returned
directly in the JSON response. No email, no OTP, no verification, no approval.

## TL;DR for agents

\`\`\`
BASE        https://agentmemo.dev
AUTH        Authorization: Bearer am_sk_...          (scopes: read, write)
REGISTER    POST   /signup         -> { "api_key": "am_sk_..." }   (returned once, no auth needed)
STORE       POST   /memory/store   (write)  -> embeds + persists a memory
RETRIEVE    GET    /memory/retrieve (read)  -> semantic search, ranked
FORGET      DELETE /memory/forget  (write)  -> delete by id or scope
USAGE       GET    /usage          -> used / limit / tier / reset_date
DOCS        https://agentmemo.dev/docs
MCP         https://agentmemo.dev/mcp   (manifest: /mcp.json)
DISCOVERY   https://agentmemo.dev/.well-known/agent.json
            https://agentmemo.dev/agent-card.json   (A2A AgentCard)
            https://agentmemo.dev/capabilities.json
\`\`\`

## Service

| Field | Value |
| ----- | ----- |
| \`name\` | AgentMemo |
| \`description\` | Persistent memory API for AI agents |
| \`api_base\` | https://agentmemo.dev |
| \`docs\` | https://agentmemo.dev/docs |
| \`discovery\` | https://agentmemo.dev/.well-known/agent.json |
| \`auth_method\` | Bearer token (\`Authorization: Bearer am_sk_...\`) |
| \`scopes_supported\` | \`read\`, \`write\` |
| \`content_type\` | \`application/json\` (request and response) |

## Step 1 — Discover

Fetch the machine-readable metadata to learn endpoints, scopes, skills, and pricing:

\`\`\`http
GET /.well-known/agent.json
GET /agent-card.json        # A2A AgentCard (skills, securitySchemes)
GET /capabilities.json      # full capability + use-case catalog
\`\`\`

The \`authentication\` block names the signup endpoint and supported scopes; the
\`skills\` array lists the callable operations (store, retrieve, forget).

## Step 2 — Register (self-serve, no auth required)

POST to /signup with a \`name\`. \`email\` is **optional** (stored for our records
only; never required for an agent). The key is returned in the response body.

\`\`\`http
POST /signup
Content-Type: application/json

{ "name": "my-agent" }
\`\`\`

Response (\`201 Created\`) — the \`api_key\` is returned **exactly once**:

\`\`\`json
{
  "id": "am_pk_...",
  "api_key": "am_sk_...",
  "tier": "free",
  "limit": 10000,
  "reset_date": 1782864000000,
  "scopes": ["read", "write"],
  "docs": "https://agentmemo.dev/docs",
  "mcp": "https://agentmemo.dev/mcp"
}
\`\`\`

Persist the returned \`am_sk_\` key securely — it cannot be recovered. There is no
email, OTP, or verification step. (Privileged/Pro keys can also be minted by an
operator via \`POST /auth/keys\` with the admin secret, but agents should use
\`/signup\`.)

## Step 3 — Authenticate

Present the API key as a bearer token on **every** request:

\`\`\`http
Authorization: Bearer am_sk_your_key
\`\`\`

Scopes: \`read\` (retrieve, usage) and \`write\` (store, forget). A \`403\` means your
key lacks the required scope or has been revoked.

## Step 4 — Use the API

### Store a memory — \`POST /memory/store\` (scope: write)

\`\`\`http
POST /memory/store
Authorization: Bearer am_sk_your_key
Content-Type: application/json

{
  "user_id": "user_123",
  "agent_id": "support_bot",
  "content": "The customer prefers email and is on the Pro plan.",
  "metadata": { "channel": "email", "plan": "pro" }
}
\`\`\`

Returns \`201\` with the created \`id\` and \`"embedded": true\`. \`content\` is embedded
automatically so it becomes semantically searchable. Max content length: 100,000
characters. \`metadata\` is any JSON object.

### Retrieve memories — \`GET /memory/retrieve\` (scope: read)

\`\`\`http
GET /memory/retrieve?user_id=user_123&q=how+to+contact+them&limit=5
Authorization: Bearer am_sk_your_key
\`\`\`

Query params: \`q\` (required, natural-language query), \`user_id\` (required),
\`agent_id\` (optional), \`limit\` (optional, default 10, max 100), \`min_score\`
(optional float). Results are ranked by cosine similarity and include a \`score\`.
If embeddings are briefly unavailable, results fall back to most-recent with
\`"semantic": false\`.

### Forget memories — \`DELETE /memory/forget\` (scope: write)

\`\`\`http
DELETE /memory/forget?id=mem_...                       # one memory
DELETE /memory/forget?user_id=user_123&agent_id=bot    # a whole scope
Authorization: Bearer am_sk_your_key
\`\`\`

Provide either \`id\` or \`user_id\`. Returns \`{ "deleted": <n> }\`. Deletes are always
restricted to your own key — you cannot touch another tenant's data.

### Usage — \`GET /usage\`

Returns totals (requests, tokens, errors, average latency), a per-route breakdown,
and daily buckets for the calling key.

## Pricing

**Public beta: free and unlimited — no operation limits.** A per-key rate limit
(100 req/min) applies as abuse protection only. Paid plans arrive after beta;
existing keys keep working.

## Payments — agents upgrade themselves

Agents can self-upgrade to Pro with no human in the loop via the Dodo Payments
MCP server:

- Dodo MCP: \`https://mcp.dodopayments.com\`
- Product ID: \`pdt_0NhKvw8RSLuiPu2bD2IQH\`
- Flow: connect the Dodo MCP server, create + complete a payment for the product,
  and Dodo posts a signed webhook to \`https://agentmemo.dev/webhooks/dodo\` which
  upgrades your key to the \`pro\` tier automatically.
- Guide: https://agentmemo.dev/docs/agent-payments
- Human checkout link is also returned as \`upgrade_url\` from POST /signup.

This enables fully autonomous agent operation — an agent can register, hit its
free-tier ceiling, pay for its own upgrade, and keep working.

## Errors

Errors return the matching HTTP status with a JSON body
\`{ "error": { "status", "message" } }\`.

| Code | Where | What to do |
| ---- | ----- | ---------- |
| \`400\` | any | Invalid request — fix missing/malformed fields. |
| \`401\` | any | Missing or invalid API key. Register at Step 2. |
| \`403\` | any | Key revoked or missing required scope. Request a key with the needed scope. |
| \`404\` | \`/memory/forget\` | Memory id not found. |
| \`429\` | any | Rate limited — back off and retry with exponential backoff. |

## Notes for agents

- All requests and responses are JSON. Always send \`Content-Type: application/json\` on POST.
- Memories are isolated per \`(api_key, user_id, agent_id)\`. Use a stable \`user_id\` per end-user and a stable \`agent_id\` per agent so retrieval stays scoped.
- Retrieval is semantic: phrase \`q\` as the question you actually want answered, not keywords.
- Re-using the same key is fine and expected; one key can serve many users and agents.
`;

export const AGENT_JSON = {
  schema_version: "1.0",
  protocol: "auth.md/api_key",
  name: "AgentMemo",
  description: "Persistent memory API for AI agents",
  version: "1.0.0",
  url: "https://agentmemo.dev",
  documentationUrl: "https://agentmemo.dev/docs",
  provider: {
    organization: "AgentMemo",
    url: "https://agentmemo.dev",
  },
  authentication: {
    type: "bearer",
    scheme: "Bearer",
    token_prefix: "am_sk_",
    registration: "https://agentmemo.dev/auth.md",
    signup_endpoint: "POST /signup",
    self_serve: true,
    human_interaction_required: false,
    scopes_supported: ["read", "write"],
  },
  capabilities: {
    semantic_search: true,
    persistence: true,
    multi_tenant: true,
    streaming: false,
  },
  skills: [
    {
      id: "store",
      name: "Store memory",
      description: "Persist a memory for a user/agent; embedded for semantic search.",
      method: "POST",
      path: "/memory/store",
      scopes: ["write"],
    },
    {
      id: "retrieve",
      name: "Retrieve memories",
      description: "Semantic search over a user's memories, ranked by relevance.",
      method: "GET",
      path: "/memory/retrieve",
      scopes: ["read"],
    },
    {
      id: "forget",
      name: "Forget memories",
      description: "Delete a specific memory or an entire user/agent scope.",
      method: "DELETE",
      path: "/memory/forget",
      scopes: ["write"],
    },
    {
      id: "usage",
      name: "Usage",
      description: "Usage stats (requests, tokens, latency) for the calling key.",
      method: "GET",
      path: "/usage",
      scopes: ["read", "write"],
    },
  ],
  pricing: [
    {
      tier: "beta",
      price_usd_monthly: 0,
      unlimited: true,
      note: "Free and unlimited during public beta — no operation limits.",
    },
  ],
  endpoints: {
    api_base: "https://agentmemo.dev",
    docs: "https://agentmemo.dev/docs",
    auth_manifest: "https://agentmemo.dev/auth.md",
    signup: "https://agentmemo.dev/signup",
    mcp: "https://agentmemo.dev/mcp",
  },
} as const;
