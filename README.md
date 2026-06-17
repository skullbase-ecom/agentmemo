# AgentMemo

An Agent Memory API on **Cloudflare Workers** (Hono) with **D1** for storage, **KV** for caching, and **Workers AI** for embeddings — so agents can store, semantically retrieve, and forget long-term memories.

## Endpoints

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `POST` | `/auth/keys` | Admin secret | Mint a developer API key (plaintext returned once) |
| `POST` | `/memory/store` | API key (`write`) | Store a memory + embedding |
| `GET`  | `/memory/retrieve` | API key (`read`) | Semantic search over memories |
| `DELETE` | `/memory/forget` | API key (`write`) | Delete a memory by id, or a whole user/agent scope |
| `GET`  | `/usage` | API key | Usage stats (requests, tokens, latency, per-route, daily) |
| `GET`  | `/health` | — | Liveness + D1 connectivity |

Authenticate API requests with `Authorization: Bearer am_sk_...`.

## How retrieval works

On `store`, the content is embedded via Workers AI (`@cf/baai/bge-base-en-v1.5`, 768-dim) and the L2-normalized vector is saved in D1. On `retrieve`, the query is embedded and candidate memories for the `(key, user[, agent])` scope are ranked by cosine similarity in the Worker, top-k returned. Results are cached in KV per exact query, keyed by a per-scope version counter that `store`/`forget` bump for immediate invalidation. If Workers AI is unavailable, store/retrieve degrade gracefully to recency ordering (`semantic: false`).

## Setup

```bash
npm install
npx wrangler login

# Create resources, then paste the returned ids into wrangler.toml:
npx wrangler d1 create agentmemo-db
npx wrangler kv namespace create CACHE

# Apply the schema (local + remote):
npm run db:schema:local
npm run db:schema:remote

# Admin secret used to mint keys:
npx wrangler secret put ADMIN_SECRET          # production
cp .dev.vars.example .dev.vars                # local dev (edit the value)
```

## Run & deploy

```bash
npm run dev       # local: http://127.0.0.1:8787
npm run deploy    # publish to Cloudflare
npm run typecheck # tsc --noEmit
```

> Note: Workers AI does not run in `wrangler dev --local`; embeddings (and thus semantic ranking) only activate against the deployed Worker or with remote bindings. Locally, retrieval falls back to recency.

## Example

```bash
# 1. Mint a key (admin)
curl -X POST $BASE/auth/keys \
  -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"name":"my-app","owner":"dev@example.com","scopes":["read","write"]}'
# => { "id": "am_pk_...", "key": "am_sk_...", ... }   (store the key — shown once)

# 2. Store a memory
curl -X POST $BASE/memory/store \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"user_id":"u1","agent_id":"a1","content":"User prefers dark mode and lives in Berlin.","metadata":{"topic":"prefs"}}'

# 3. Retrieve semantically
curl "$BASE/memory/retrieve?user_id=u1&agent_id=a1&q=where%20does%20the%20user%20live&limit=5" \
  -H "Authorization: Bearer $KEY"

# 4. Usage
curl "$BASE/usage" -H "Authorization: Bearer $KEY"

# 5. Forget
curl -X DELETE "$BASE/memory/forget?id=mem_..." -H "Authorization: Bearer $KEY"
curl -X DELETE "$BASE/memory/forget?user_id=u1&agent_id=a1" -H "Authorization: Bearer $KEY"
```

## Project layout

```
wrangler.toml          Worker config + D1/KV/AI bindings
schema.sql             D1 schema (api_keys, memories, usage_events)
seed.sql               Optional local demo key
src/
  index.ts             App wiring, middleware order, error handling
  types.ts             Env bindings + shared types
  lib/
    crypto.ts          Key generation, SHA-256 hashing, timing-safe compare
    embeddings.ts      Workers AI embeddings + cosine similarity
    http.ts            JSON errors + input validation
    ids.ts             Prefixed entity ids
  middleware/
    auth.ts            API-key auth (KV-cached) + scope enforcement
    usage.ts           Per-request usage metering (fire-and-forget)
  routes/
    auth.ts            POST /auth/keys
    memory.ts          store / retrieve / forget
    usage.ts           GET /usage
```

## Security notes

- API keys are stored only as SHA-256 hashes; plaintext is returned once at creation.
- All memory reads/writes/deletes are scoped to the calling key — no cross-tenant access.
- Key minting requires `ADMIN_SECRET` (timing-safe compared); never commit it.
