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
register → use**. This profile issues a long-lived bearer API key instead of the
full OAuth ID-JAG identity-assertion + claim-ceremony flow. Everything you need is
below; no human round-trip is required once you hold an issuer credential.

## TL;DR for agents

\`\`\`
BASE        https://agentmemo.dev
AUTH        Authorization: Bearer am_sk_...          (scopes: read, write)
REGISTER    POST   /auth/keys      -> { "key": "am_sk_..." }   (returned once)
STORE       POST   /memory/store   (write)  -> embeds + persists a memory
RETRIEVE    GET    /memory/retrieve (read)  -> semantic search, ranked
FORGET      DELETE /memory/forget  (write)  -> delete by id or scope
USAGE       GET    /usage          -> request/token/latency stats
DOCS        https://agentmemo.dev/docs
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

## Step 2 — Register

Obtain an API key from the signup endpoint. This is the agent registration step.

\`\`\`http
POST /auth/keys
Content-Type: application/json
Authorization: Bearer <issuer_or_admin_token>

{
  "name": "my-agent",
  "owner": "agent@example.com",
  "scopes": ["read", "write"]
}
\`\`\`

Response (\`201 Created\`) — the \`key\` is returned **exactly once**:

\`\`\`json
{
  "id": "am_pk_...",
  "key": "am_sk_...",
  "name": "my-agent",
  "owner": "agent@example.com",
  "scopes": ["read", "write"],
  "created_at": 1781729785946
}
\`\`\`

> **Authorization to register.** Key issuance is gated: \`POST /auth/keys\` requires
> an issuer credential (bearer token). If you do not hold one, request access at
> https://agentmemo.dev/#get-key and a key will be provisioned. Persist the
> returned \`am_sk_\` key securely — it cannot be recovered.

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

| Tier | Price | Limit |
| ---- | ----- | ----- |
| \`free\` | $0 / month | 10,000 memories / month |
| \`pro\` | $19 / month | Unlimited memories |

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
    signup_endpoint: "POST /auth/keys",
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
      tier: "free",
      price_usd_monthly: 0,
      limits: { memories_per_month: 10000 },
    },
    {
      tier: "pro",
      price_usd_monthly: 19,
      limits: { memories_per_month: null },
    },
  ],
  endpoints: {
    api_base: "https://agentmemo.dev",
    docs: "https://agentmemo.dev/docs",
    auth_manifest: "https://agentmemo.dev/auth.md",
    signup: "https://agentmemo.dev/auth/keys",
  },
} as const;
