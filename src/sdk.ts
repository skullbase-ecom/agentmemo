// SDK discovery served at /sdk, /sdk/js, /sdk/python. Install + quickstart +
// link to the full publish-ready source in the repo.

const RAW = "https://raw.githubusercontent.com/skullbase-ecom/agentmemo/master/sdk";

export const SDK_JS = `# AgentMemo — JavaScript / TypeScript SDK

Install:
  npm install agentmemo-sdk

Quickstart:
  import { AgentMemo } from "agentmemo-sdk";
  const { api_key } = await AgentMemo.signup("my-agent");
  const memory = new AgentMemo(api_key);

  await memory.store({ userId: "u1", agentId: "a1", content: "User prefers dark mode." });
  const hits = await memory.retrieve({ userId: "u1", query: "preferences" });
  const ctx  = await memory.context({ userId: "u1", format: "anthropic" });

Methods: store, retrieve, forget, context, feedback, batch, stats, usage, AgentMemo.signup
Zero dependencies. Node 18+, Deno, Bun, browser, Cloudflare Workers.

Full source: ${RAW}/js/index.js
Types:       ${RAW}/js/index.d.ts
Docs:        https://agentmemo.dev/docs
`;

export const SDK_PY = `# AgentMemo — Python SDK

Install:
  pip install agentmemo-py

Quickstart:
  from agentmemo import MemoryClient
  key = MemoryClient.signup("my-agent")["api_key"]
  mem = MemoryClient(key)

  mem.store(user_id="u1", agent_id="a1", content="User prefers dark mode.")
  hits = mem.search(user_id="u1", query="preferences")
  ctx  = mem.context(user_id="u1", format="anthropic")["context"]

Methods: store, search, delete, context, feedback, batch, stats, usage, MemoryClient.signup
Async: async_store / async_search (pip install agentmemo[async])
Standard library only (no required deps).

Full source: ${RAW}/python/agentmemo/__init__.py
Docs:        https://agentmemo.dev/docs
`;

export const SDK_INDEX = `# AgentMemo SDKs

JavaScript / TypeScript:  npm install agentmemo-sdk    ->  https://agentmemo.dev/sdk/js
Python:                   pip install agentmemo-py     ->  https://agentmemo.dev/sdk/python

Source: https://github.com/skullbase-ecom/agentmemo (sdk/)
`;
