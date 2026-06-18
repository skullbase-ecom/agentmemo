// AgentMemo JavaScript/TypeScript SDK — zero dependencies, native fetch.
// Works in Node 18+, Deno, Bun, browsers, and Cloudflare Workers.

export class AgentMemoError extends Error {
  constructor(message, status, code, body) {
    super(message);
    this.name = "AgentMemoError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export class AgentMemo {
  constructor(apiKey, opts = {}) {
    if (!apiKey) throw new AgentMemoError("apiKey is required", 0, "no_api_key");
    this.apiKey = apiKey;
    this.baseUrl = (opts.baseUrl || "https://agentmemo.dev").replace(/\/$/, "");
  }

  async _req(method, path, body) {
    const headers = { Authorization: `Bearer ${this.apiKey}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(this.baseUrl + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error : "request failed";
      throw new AgentMemoError(msg, res.status, data.code, data);
    }
    return data;
  }

  store(p) {
    return this._req("POST", "/memory/store", {
      user_id: p.userId, agent_id: p.agentId, content: p.content,
      metadata: p.metadata, ttl_seconds: p.ttlSeconds, tags: p.tags,
      namespace: p.namespace, importance: p.importance, outcome: p.outcome,
      detect_conflicts: p.detectConflicts,
    });
  }

  retrieve(p) {
    const q = new URLSearchParams({ user_id: p.userId, q: p.query });
    if (p.agentId) q.set("agent_id", p.agentId);
    if (p.limit != null) q.set("limit", String(p.limit));
    if (p.namespace) q.set("namespace", p.namespace);
    if (p.tags) q.set("tags", Array.isArray(p.tags) ? p.tags.join(",") : p.tags);
    if (p.minImportance != null) q.set("min_importance", String(p.minImportance));
    return this._req("GET", "/memory/retrieve?" + q.toString());
  }

  forget(p = {}) {
    const q = new URLSearchParams();
    if (p.id) q.set("id", p.id);
    if (p.userId) q.set("user_id", p.userId);
    if (p.agentId) q.set("agent_id", p.agentId);
    return this._req("DELETE", "/memory/forget?" + q.toString());
  }

  context(p) {
    const q = new URLSearchParams({ user_id: p.userId });
    if (p.agentId) q.set("agent_id", p.agentId);
    if (p.maxTokens != null) q.set("max_tokens", String(p.maxTokens));
    if (p.format) q.set("format", p.format);
    return this._req("GET", "/memory/context?" + q.toString());
  }

  feedback(p) {
    return this._req("POST", "/memory/feedback", {
      memory_id: p.memoryId, outcome: p.outcome, confidence: p.confidence,
    });
  }

  batch(memories) {
    return this._req("POST", "/memory/batch", { memories });
  }

  stats(p = {}) {
    const q = new URLSearchParams();
    if (p.userId) q.set("user_id", p.userId);
    return this._req("GET", "/memory/stats?" + q.toString());
  }

  usage() {
    return this._req("GET", "/usage");
  }

  /** Self-serve: create a free API key. No auth required. */
  static async signup(name, baseUrl = "https://agentmemo.dev") {
    const res = await fetch(baseUrl.replace(/\/$/, "") + "/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.json();
  }
}

export default AgentMemo;
