# AgentMemo

> Memory for the agentic web.

[![Live](https://img.shields.io/badge/live-agentmemo.dev-8b5cf6)](https://agentmemo.dev)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-native-22c55e)](https://agentmemo.dev/.well-known/mcp/server-card.json)
[![OWASP](https://img.shields.io/badge/OWASP%20ASI06-protected-ef4444)](https://agentmemo.dev/security)

Persistent memory infrastructure for AI agents. Store, semantically retrieve, and recall context across every session — at the edge, in milliseconds. Model-agnostic, MCP-native, security-first.

**Live:** https://agentmemo.dev · **Docs:** https://agentmemo.dev/docs · **Free & unlimited during public beta.**

## Quick start (60 seconds)

```bash
# 1. Get a free API key (self-serve, no human needed)
curl -X POST https://agentmemo.dev/signup -d '{"name":"my-agent"}'

# 2. Store a memory
curl -X POST https://agentmemo.dev/memory/store \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"user_id":"user_123","agent_id":"assistant","content":"User prefers dark mode, works in TypeScript"}'

# 3. Retrieve semantically
curl "https://agentmemo.dev/memory/retrieve?user_id=user_123&q=user+preferences" \
  -H "Authorization: Bearer YOUR_KEY"

# 4. Get context formatted for an LLM system prompt
curl "https://agentmemo.dev/memory/context?user_id=user_123&format=anthropic" \
  -H "Authorization: Bearer YOUR_KEY"
```

## Claude Managed Agents

Add persistent memory to any Claude Managed Agent in one line of JSON:

```json
{
  "mcp_servers": [{
    "type": "url",
    "name": "agentmemo",
    "url": "https://agentmemo.dev/mcp",
    "authorization_token": "Bearer YOUR_KEY"
  }]
}
```

Tools: `store_memory`, `retrieve_memory`, `get_context`, `forget_memory`, `give_feedback`, `get_stats`, `get_usage`.

## SDKs

```bash
npm install agentmemo-sdk     # JavaScript / TypeScript (zero deps)
pip install agentmemo-py      # Python (stdlib only)
```

```js
import { AgentMemo } from "agentmemo-sdk";
const m = new AgentMemo("YOUR_KEY");
await m.store({ userId: "u1", agentId: "a1", content: "Prefers dark mode" });
const { results } = await m.retrieve({ userId: "u1", query: "preferences" });
```

## Memory types

| Type | Endpoints | What it's for |
|------|-----------|---------------|
| Semantic | `/memory/store`, `/retrieve`, `/forget` | Facts & knowledge (importance, TTL, tags, namespaces) |
| Episodic | `/memory/episodes/*` | Replayable sessions, auto-summarized |
| Procedural | `/memory/procedures`, `/procedures/match` | How-to workflows, matched to a task |
| Working | `/memory/working` | Short-term per-session context (1h TTL) |
| Emotional | `/memory/emotional`, `/emotional/profile` | Sentiment + per-user trust score |

Plus a memory **graph** (link/explore/conflicts), **context builder**, **batch**, **feedback**, **compression**, **import/export**, **stats**, and **agent identity**.

## Why AgentMemo

| Feature | AgentMemo | Mem0 | Zep |
|---|---|---|---|
| Edge deployment | ✅ | ❌ | ❌ |
| MCP native | ✅ | ❌ | ❌ |
| auth.md support | ✅ | ❌ | ❌ |
| OWASP ASI06 protection | ✅ | ❌ | ❌ |
| Full audit trail | ✅ | ❌ | ❌ |
| Free tier | ✅ unlimited (beta) | ✅ limited | ❌ |
| Graph memory | ✅ basic | paid | ✅ |
| Temporal KG | roadmap | ❌ | ✅ |
| Open source | ✅ | ✅ | partial |

## Architecture

```
  Agent / LLM
      │  HTTPS (REST or MCP)
      ▼
  ┌──────────────────────────────┐
  │  AgentMemo API (edge)        │
  │  • auth + trust scoring      │
  │  • embeddings + vector rank  │
  │  • audit log                 │
  └───────┬───────────┬──────────┘
          │           │
      vector DB    KV cache
   (durable memory) (hot reads + rate limits)
```

## Discovery (for agents)

- OpenAPI: https://agentmemo.dev/openapi.json
- MCP server card: https://agentmemo.dev/.well-known/mcp/server-card.json
- auth.md: https://agentmemo.dev/auth.md
- llms.txt: https://agentmemo.dev/llms.txt
- Agent card: https://agentmemo.dev/agent-card.json
- Capabilities: https://agentmemo.dev/capabilities.json
- Observatory (live, anonymized): https://agentmemo.dev/observatory

## Documentation

[Docs](https://agentmemo.dev/docs) · [Pricing](https://agentmemo.dev/pricing) · [Security](https://agentmemo.dev/security) · [Benchmarks](https://agentmemo.dev/benchmarks) · [Playground](https://agentmemo.dev/playground) · [Status](https://agentmemo.dev/status) · [Manifesto](https://agentmemo.dev/manifesto)

## License

Apache-2.0.

## Built by

**Dr. Nadeem Shaikh** — Nanded, Maharashtra, India 🇮🇳. For every AI agent on earth.
