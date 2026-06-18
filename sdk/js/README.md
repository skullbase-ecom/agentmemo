# agentmemo

Persistent memory for AI agents. Store, semantically retrieve, and recall context across sessions — at the edge, in milliseconds. Zero dependencies, native `fetch`.

```bash
npm install agentmemo
```

## Quick start

```js
import { AgentMemo } from "agentmemo";

// Get a free key (or pass an existing one)
const { api_key } = await AgentMemo.signup("my-agent");
const memory = new AgentMemo(api_key);

// Store
await memory.store({
  userId: "user_123",
  agentId: "assistant",
  content: "User prefers dark mode and works in TypeScript.",
  tags: ["preference"],
  importance: 8,
});

// Retrieve semantically
const { results } = await memory.retrieve({
  userId: "user_123",
  query: "what are the user's preferences?",
});

// Get context ready for an LLM system prompt
const { context } = await memory.context({ userId: "user_123", format: "anthropic" });
```

## API

- `store({ userId, agentId, content, metadata?, ttlSeconds?, tags?, namespace?, importance?, outcome?, detectConflicts? })`
- `retrieve({ userId, query, agentId?, limit?, namespace?, tags?, minImportance? })`
- `forget({ id? | userId?, agentId? })`
- `context({ userId, agentId?, maxTokens?, format? })`
- `feedback({ memoryId, outcome, confidence? })`
- `batch(memories[])`
- `stats({ userId? })`
- `usage()`
- `AgentMemo.signup(name)` — static, returns a free API key

Errors throw `AgentMemoError` with `.status`, `.code`, and `.body`.

Docs: https://agentmemo.dev/docs · Apache-2.0 · Built by Dr. Nadeem Shaikh
