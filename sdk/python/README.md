# agentmemo

Persistent memory for AI agents. Store, semantically retrieve, and recall context across sessions. Pure standard library (no required dependencies).

```bash
pip install agentmemo
```

## Quick start

```python
from agentmemo import MemoryClient

# Get a free key (or pass an existing one)
key = MemoryClient.signup("my-agent")["api_key"]
mem = MemoryClient(key)

# Store
mem.store(
    user_id="user_123",
    agent_id="assistant",
    content="User prefers dark mode and works in TypeScript.",
    tags=["preference"],
    importance=8,
)

# Retrieve semantically
hits = mem.search(user_id="user_123", query="what are the user's preferences?")

# Context for an LLM system prompt
ctx = mem.context(user_id="user_123", format="anthropic")["context"]
```

## API

- `store(user_id, agent_id, content, metadata=None, ttl_seconds=None, tags=None, namespace="default", importance=5, outcome="unknown", detect_conflicts=False)`
- `search(user_id, query, agent_id=None, limit=10, namespace=None, tags=None, min_importance=None)`
- `delete(id=None, user_id=None, agent_id=None)`
- `context(user_id, agent_id=None, max_tokens=2000, format="raw")`
- `feedback(memory_id, outcome, confidence=1.0)`
- `batch(memories)`
- `stats(user_id=None)`, `usage()`
- `MemoryClient.signup(name)` — static, returns a free API key
- Async: `await mem.async_store(...)`, `await mem.async_search(...)` (requires `pip install agentmemo[async]`)

Errors raise `AgentMemoError` with `.status`, `.code`, `.body`.

Docs: https://agentmemo.dev/docs · Apache-2.0 · Built by Dr. Nadeem Shaikh
