// Agent-facing discovery documents:
//   GET /auth.md                  — auth.md agent-registration manifest (WorkOS open spec, API-key profile)
//   GET /.well-known/agent.json   — machine-readable agent/service metadata
//
// AgentMemo authenticates with long-lived bearer API keys rather than the full
// OAuth ID-JAG + claim-ceremony flow, so this is a simplified ("api_key") profile
// of the auth.md protocol: discover -> register -> use.

export const AUTH_MD = `# auth.md

You are an agent. **AgentMemo** is a persistent memory API for AI agents. This
service supports **agentic registration** using a simplified, API-key profile of
the auth.md protocol: **discover → register → use**. Follow the steps in order.

This profile does not implement the OAuth ID-JAG identity-assertion or claim
ceremony described in the full spec. Registration issues a long-lived bearer API
key instead of short-lived access tokens. Everything an agent needs is below.

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

## Step 1 — Discover

Fetch the machine-readable metadata to learn endpoints, scopes, and pricing:

\`\`\`http
GET /.well-known/agent.json
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

> **Authorization to register.** Key issuance is currently gated: \`POST /auth/keys\`
> requires an issuer credential (bearer token). If you do not hold one, request
> access at https://agentmemo.dev/#get-key and a key will be provisioned for you.
> Persist the returned \`am_sk_\` key securely; it cannot be recovered.

## Step 3 — Authenticate & use

Present the API key as a bearer token on every request:

\`\`\`http
Authorization: Bearer am_sk_your_key
\`\`\`

Keys carry scopes — \`read\` (retrieve, usage) and \`write\` (store, forget):

\`\`\`http
POST   /memory/store      # store a memory          (scope: write)
GET    /memory/retrieve   # semantic search          (scope: read)
DELETE /memory/forget     # delete memories          (scope: write)
GET    /usage             # usage for the calling key (any scope)
\`\`\`

Full request/response reference: https://agentmemo.dev/docs

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
| \`429\` | any | Rate limited — back off and retry. |
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
