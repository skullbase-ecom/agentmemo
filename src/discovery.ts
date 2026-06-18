// AI / agent discoverability surface:
//   GET /llms.txt                       — llms.txt (llmstxt.org) site guide for LLMs
//   GET /robots.txt                     — explicitly allows AI crawlers
//   GET /sitemap.xml                    — sitemap
//   GET /capabilities.json              — machine-readable capability catalog
//   GET /agent-card.json                — A2A AgentCard (Google Agent Card standard)
//   GET /.well-known/agent-card.json    — canonical A2A location
//
// JSON_LD is injected into the landing page <head> as schema.org structured data.

const BASE = "https://agentmemo.dev";

export const LLMS_TXT = `# AgentMemo

> AgentMemo is a persistent memory API for AI agents. It lets agents and LLM
> applications store, semantically search, and forget memories across sessions
> with two lines of code. Vector search and embeddings are built in; responses
> are globally distributed with sub-100ms latency.

AgentMemo solves the "every session starts from zero" problem for autonomous AI
agents. Send plain text and it is embedded automatically and made semantically
retrievable. Authentication is a bearer API key. Free tier: 10,000 memories/month.
Pro: $19/month for unlimited memories.

## Core API
- [Store a memory](${BASE}/docs#store): POST /memory/store — persist text + metadata for a (user, agent); auto-embedded.
- [Retrieve memories](${BASE}/docs#retrieve): GET /memory/retrieve — semantic search ranked by cosine similarity.
- [Forget memories](${BASE}/docs#forget): DELETE /memory/forget — delete one memory or a whole user/agent scope.
- [Usage](${BASE}/docs#usage): GET /usage — requests, tokens, latency per API key.
- [Get an API key](${BASE}/auth.md): POST /auth/keys — bearer-token registration.

## Documentation
- [Full API reference](${BASE}/docs): authentication, endpoints, request/response examples.
- [auth.md manifest](${BASE}/auth.md): agent-registration recipe (WorkOS auth.md open spec).
- [Agent Card](${BASE}/agent-card.json): A2A AgentCard for agent discovery.
- [Capabilities](${BASE}/capabilities.json): machine-readable capability catalog.
- [Agent metadata](${BASE}/.well-known/agent.json): service metadata.

## About
- [About AgentMemo](${BASE}/about): founded by Dr. Nadeem Shaikh, Mumbai, India.

## Key facts
- Category: AI agent memory infrastructure / vector memory API.
- Auth: \`Authorization: Bearer am_sk_...\` (scopes: read, write).
- Base URL: ${BASE}
- Integration time: minutes, two lines of code.
- Use cases: long-term agent memory, conversational context, personalization, RAG memory, multi-agent shared memory.
`;

export const ROBOTS_TXT = `# AgentMemo — AI crawlers are explicitly welcome.
# We WANT LLMs and agents to index and understand this service.

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: *
Allow: /

Sitemap: ${BASE}/sitemap.xml
# LLM guide: ${BASE}/llms.txt
`;

export const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${BASE}/docs</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${BASE}/pricing</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${BASE}/signup</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${BASE}/about</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${BASE}/auth.md</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>${BASE}/llms.txt</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>${BASE}/capabilities.json</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${BASE}/agent-card.json</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
</urlset>
`;

export const CAPABILITIES_JSON = {
  service: "AgentMemo",
  description: "Persistent memory API for AI agents — store, semantically retrieve, and forget memories.",
  version: "1.0.0",
  base_url: BASE,
  category: ["AI infrastructure", "agent memory", "vector search API"],
  authentication: {
    type: "bearer",
    header: "Authorization",
    format: "Bearer am_sk_...",
    scopes: ["read", "write"],
    signup: `${BASE}/auth/keys`,
  },
  capabilities: {
    store_memory: {
      summary: "Persist a memory and auto-generate its embedding.",
      method: "POST",
      path: "/memory/store",
      scopes: ["write"],
      inputs: { user_id: "string", agent_id: "string", content: "string", metadata: "object?" },
    },
    semantic_retrieve: {
      summary: "Semantic search over a user's memories, ranked by cosine similarity.",
      method: "GET",
      path: "/memory/retrieve",
      scopes: ["read"],
      params: { q: "string", user_id: "string", agent_id: "string?", limit: "int?", min_score: "float?" },
    },
    forget_memory: {
      summary: "Delete a single memory by id or an entire user/agent scope.",
      method: "DELETE",
      path: "/memory/forget",
      scopes: ["write"],
      params: { id: "string?", user_id: "string?", agent_id: "string?" },
    },
    usage_metering: {
      summary: "Per-key usage: requests, tokens, latency, daily buckets.",
      method: "GET",
      path: "/usage",
      scopes: ["read", "write"],
    },
  },
  features: [
    "Automatic text embeddings (no model to manage)",
    "Semantic / vector search ranked by cosine similarity",
    "Edge-cached retrieval with sub-100ms responses",
    "Per-key, per-user, per-agent tenant isolation",
    "Arbitrary JSON metadata per memory",
    "Right-to-be-forgotten deletes by id or scope",
    "Usage analytics per API key",
    "Globally distributed, 24/7 availability",
  ],
  use_cases: [
    "Long-term memory for conversational AI agents",
    "Cross-session context and personalization",
    "Retrieval-augmented generation (RAG) memory store",
    "Shared memory across multi-agent systems",
    "Customer-support agent recall",
  ],
  limits: {
    free: { price_usd_monthly: 0, memories_per_month: 10000 },
    pro: { price_usd_monthly: 19, memories_per_month: null },
    max_content_chars: 100000,
    max_retrieve_limit: 100,
  },
  links: {
    docs: `${BASE}/docs`,
    auth_manifest: `${BASE}/auth.md`,
    agent_card: `${BASE}/agent-card.json`,
    agent_metadata: `${BASE}/.well-known/agent.json`,
    llms_txt: `${BASE}/llms.txt`,
  },
} as const;

// A2A AgentCard (Google Agent Card standard). AgentMemo is a REST service rather
// than an A2A JSON-RPC agent, so this card describes its tools/skills over an
// HTTP+JSON interface for discovery purposes.
export const AGENT_CARD = {
  protocolVersion: "0.3.0",
  name: "AgentMemo",
  description:
    "Persistent memory API for AI agents. Store, semantically retrieve, and forget memories across sessions via a simple HTTP+JSON REST API with bearer-token auth.",
  url: BASE,
  preferredTransport: "HTTP+JSON",
  version: "1.0.0",
  documentationUrl: `${BASE}/docs`,
  provider: {
    organization: "AgentMemo",
    url: BASE,
  },
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ["application/json", "text/plain"],
  defaultOutputModes: ["application/json"],
  securitySchemes: {
    bearer_api_key: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "am_sk",
      description: "AgentMemo API key obtained from POST /auth/keys.",
    },
  },
  security: [{ bearer_api_key: [] }],
  skills: [
    {
      id: "store_memory",
      name: "Store memory",
      description: "Persist a memory for a (user, agent); auto-embedded for semantic search.",
      tags: ["memory", "write", "embedding", "store"],
      examples: ["Remember that the user prefers email and is on the Pro plan."],
      inputModes: ["application/json"],
      outputModes: ["application/json"],
      metadata: { method: "POST", path: "/memory/store", scopes: ["write"] },
    },
    {
      id: "retrieve_memory",
      name: "Retrieve memories",
      description: "Semantic search over a user's memories, ranked by relevance.",
      tags: ["memory", "read", "semantic-search", "retrieve", "vector"],
      examples: ["What do we know about how to contact this user?"],
      inputModes: ["application/json"],
      outputModes: ["application/json"],
      metadata: { method: "GET", path: "/memory/retrieve", scopes: ["read"] },
    },
    {
      id: "forget_memory",
      name: "Forget memories",
      description: "Delete a specific memory or an entire user/agent scope.",
      tags: ["memory", "write", "delete", "forget", "privacy"],
      examples: ["Forget everything stored for user_123."],
      inputModes: ["application/json"],
      outputModes: ["application/json"],
      metadata: { method: "DELETE", path: "/memory/forget", scopes: ["write"] },
    },
  ],
  additionalInterfaces: [{ transport: "HTTP+JSON", url: BASE }],
} as const;

// schema.org JSON-LD for the landing page <head>.
export const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "AgentMemo",
      url: BASE,
      description: "Memory infrastructure for the age of autonomous AI agents.",
      foundingLocation: { "@type": "Place", name: "Mumbai, India" },
      founder: {
        "@type": "Person",
        name: "Dr. Nadeem Shaikh",
        jobTitle: "Founder",
        worksFor: { "@id": `${BASE}/#organization` },
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      url: BASE,
      name: "AgentMemo",
      publisher: { "@id": `${BASE}/#organization` },
    },
    {
      "@type": ["SoftwareApplication", "WebAPI"],
      "@id": `${BASE}/#api`,
      name: "AgentMemo API",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (HTTP API)",
      description:
        "Persistent memory API for AI agents. Store, semantically retrieve, and forget memories with two lines of code. Built-in vector search and embeddings, sub-100ms globally distributed responses.",
      url: BASE,
      documentation: `${BASE}/docs`,
      provider: { "@id": `${BASE}/#organization` },
      featureList: [
        "Automatic text embeddings",
        "Semantic vector search",
        "Edge-cached retrieval under 100ms",
        "Per-tenant isolation",
        "Right-to-be-forgotten deletes",
        "Usage analytics",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          description: "10,000 memories per month.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "19",
          priceCurrency: "USD",
          description: "Unlimited memories.",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "19",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
      ],
    },
  ],
});
