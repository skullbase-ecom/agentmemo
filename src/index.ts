import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import type { Env, Variables, AppContext } from "./types";
import { apiKeyAuth } from "./middleware/auth";
import { trackUsage, stripInternalHeaders } from "./middleware/usage";
import { rateLimitPerKey, freeTierQuota } from "./middleware/limits";
import memory from "./routes/memory";
import episodes from "./routes/episodes";
import procedures from "./routes/procedures";
import working from "./routes/working";
import emotional from "./routes/emotional";
import graph from "./routes/graph";
import core2 from "./routes/core2";
import memmgmt from "./routes/memmgmt";
import intelligence from "./routes/intelligence";
import agentsRoutes from "./routes/agents";
import analytics from "./routes/analytics";
import usersRoutes from "./routes/users";
import spaces from "./routes/spaces";
import templates from "./routes/templates";
import auth from "./routes/auth";
import usage from "./routes/usage";
import signup from "./routes/signup";
import webhooks from "./routes/webhooks";
import { LANDING_HTML } from "./landing";
import { DOCS_HTML } from "./docs";
import { AUTH_MD, AGENT_JSON } from "./wellknown";
import { ABOUT_HTML } from "./about";
import { PRICING_HTML } from "./pricing";
import {
  LLMS_TXT,
  HUMANS_TXT,
  ROBOTS_TXT,
  SITEMAP_XML,
  CAPABILITIES_JSON,
  AGENT_CARD,
} from "./discovery";
import { MCP_MANIFEST, handleMcpRpc, type ApiCaller } from "./mcp";
import { PROTECTED_RESOURCE_METADATA, AUTHORIZATION_SERVER_METADATA } from "./oauth-metadata";
import { STATUS_HTML, runStatusChecks } from "./status";
import { OBSERVATORY_HTML, runObservatory } from "./observatory";
import { CHANGELOG_HTML } from "./changelog";
import { NOT_FOUND_HTML, ERROR_HTML } from "./error-pages";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", logger());
// Security headers on every response. CSP allows our inline styles/scripts and
// data: images (favicons, founder portrait) but nothing third-party.
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
  }),
);
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  }),
);

// ---- Public routes -------------------------------------------------------
// Marketing landing page (cached at the edge for an hour).
app.get("/", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.html(LANDING_HTML);
});

// API documentation page (cached at the edge for an hour).
app.get("/docs", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.html(DOCS_HTML);
});

// About / founder page.
app.get("/about", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.html(ABOUT_HTML);
});

// Pricing page.
app.get("/pricing", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.html(PRICING_HTML);
});

// Changelog.
app.get("/changelog", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.html(CHANGELOG_HTML);
});

// Live status page (auto-refreshing) + machine-readable JSON.
app.get("/status", (c) => {
  c.header("cache-control", "no-store");
  return c.html(STATUS_HTML);
});
app.get("/status.json", async (c) => {
  c.header("cache-control", "no-store");
  return c.json(await runStatusChecks(c.env, Date.now()));
});

// Observatory — public, no-auth, anonymized live view of the agentic web.
app.get("/observatory", (c) => {
  c.header("cache-control", "no-store");
  return c.html(OBSERVATORY_HTML);
});
app.get("/observatory.json", async (c) => {
  c.header("cache-control", "public, max-age=60");
  return c.json(await runObservatory(c.env, Date.now()));
});

// auth.md agent-registration manifest (WorkOS auth.md open spec, api_key profile).
app.get("/auth.md", (c) => {
  c.header("content-type", "text/markdown; charset=utf-8");
  c.header("cache-control", "public, max-age=3600");
  return c.body(AUTH_MD);
});

// Agent discovery metadata.
app.get("/.well-known/agent.json", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.json(AGENT_JSON);
});

// ---- AI / agent discoverability surface --------------------------------
const textRoute = (body: string, contentType: string) => (c: AppContext) => {
  c.header("content-type", contentType);
  c.header("cache-control", "public, max-age=3600");
  return c.body(body);
};

// llms.txt — LLM-facing site guide (llmstxt.org).
app.get("/llms.txt", textRoute(LLMS_TXT, "text/plain; charset=utf-8"));
// robots.txt — explicitly allow AI crawlers.
app.get("/robots.txt", textRoute(ROBOTS_TXT, "text/plain; charset=utf-8"));
// humans.txt — for the humans.
app.get("/humans.txt", textRoute(HUMANS_TXT, "text/plain; charset=utf-8"));
// sitemap.
app.get("/sitemap.xml", textRoute(SITEMAP_XML, "application/xml; charset=utf-8"));

// Machine-readable capability catalog.
app.get("/capabilities.json", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.json(CAPABILITIES_JSON);
});

// A2A AgentCard (Google Agent Card standard) — at the requested path and the
// canonical .well-known location.
const agentCard = (c: AppContext) => {
  c.header("cache-control", "public, max-age=3600");
  return c.json(AGENT_CARD);
};
app.get("/agent-card.json", agentCard);
app.get("/.well-known/agent-card.json", agentCard);

// OAuth-style discovery metadata referenced by auth.md (api_key profile).
app.get("/.well-known/oauth-protected-resource", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.json(PROTECTED_RESOURCE_METADATA);
});
app.get("/.well-known/oauth-authorization-server", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.json(AUTHORIZATION_SERVER_METADATA);
});

// ---- MCP server --------------------------------------------------------
// Discovery manifest.
app.get("/mcp.json", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.json(MCP_MANIFEST);
});

// JSON-RPC endpoint (Streamable HTTP). Tools dispatch to the REST routes so
// auth, rate limits, and quota are enforced uniformly. The MCP client sends its
// AgentMemo API key as `Authorization: Bearer am_sk_...`.
app.post("/mcp", async (c) => {
  const payload = await c.req.json().catch(() => null);
  if (payload === null) {
    return c.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const authHeader = c.req.header("authorization") ?? "";

  const call: ApiCaller = async ({ method, path, body }) => {
    const headers: Record<string, string> = {};
    if (authHeader) headers["authorization"] = authHeader;
    if (body !== undefined) headers["content-type"] = "application/json";
    const req = new Request(`https://agentmemo.dev${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const res = await app.fetch(req, c.env, c.executionCtx);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  };

  // Support single messages and JSON-RPC batches.
  if (Array.isArray(payload)) {
    const out = (await Promise.all(payload.map((m) => handleMcpRpc(m, call)))).filter(Boolean);
    return out.length ? c.json(out) : new Response(null, { status: 202 });
  }
  const response = await handleMcpRpc(payload, call);
  return response ? c.json(response) : new Response(null, { status: 202 });
});

// Machine-readable API index.
app.get("/api", (c) =>
  c.json({
    name: "AgentMemo",
    description: "Agent Memory API — store, semantically retrieve, and forget agent memories.",
    version: "1.0.0",
    endpoints: {
      "POST /auth/keys": "mint a developer API key (admin only)",
      "POST /memory/store": "store an agent memory",
      "GET /memory/retrieve": "semantic search over memories",
      "DELETE /memory/forget": "delete memories",
      "GET /usage": "usage stats for the calling key",
    },
  }),
);

app.get("/health", async (c) => {
  // Lightweight liveness + D1 connectivity check.
  let db = "ok";
  try {
    await c.env.DB.prepare("SELECT 1").first();
  } catch {
    db = "error";
  }
  return c.json({ status: db === "ok" ? "healthy" : "degraded", db }, db === "ok" ? 200 : 503);
});

// Admin-gated key minting (uses ADMIN_SECRET, not an API key).
app.route("/auth", auth);

// Public self-serve signup (free-tier key).
app.route("/signup", signup);

// ---- Protected routes ----------------------------------------------------
// Order: strip headers -> record usage -> authenticate -> rate limit -> quota -> handler.
const authed = [stripInternalHeaders, trackUsage, apiKeyAuth, rateLimitPerKey] as const;
app.use("/memory/*", ...authed, freeTierQuota);
app.use("/usage", ...authed);
app.use("/usage/*", ...authed);
app.use("/agents", ...authed);
app.use("/agents/*", ...authed);
app.use("/analytics/*", ...authed);
app.use("/users/*", ...authed);
app.use("/spaces", ...authed);
app.use("/spaces/*", ...authed);
app.use("/templates", ...authed);
app.use("/templates/*", ...authed);
app.use("/webhooks/register", ...authed);
app.use("/webhooks/logs", ...authed);

// Memory-type sub-APIs (Phase 1) + intelligence/management (Phase 2). All under
// /memory/* so the protect chain applies.
app.route("/memory/episodes", episodes);
app.route("/memory/procedures", procedures);
app.route("/memory/working", working);
app.route("/memory/emotional", emotional);
app.route("/memory/graph", graph);
app.route("/memory", core2);
app.route("/memory", memmgmt);
app.route("/memory", intelligence);
app.route("/memory", memory);
app.route("/usage", usage);

// Phase 2 — agent identity, analytics, GDPR, spaces, templates.
app.route("/agents", agentsRoutes);
app.route("/analytics", analytics);
app.route("/users", usersRoutes);
app.route("/spaces", spaces);
app.route("/templates", templates);

// Webhooks: /register and /logs are authed (use() above); /dodo stays public.
app.route("/webhooks", webhooks);

// ---- Error handling ------------------------------------------------------
// Browsers get a dark-theme HTML page; API clients get the JSON error shape.
function wantsHtml(c: AppContext): boolean {
  return (c.req.header("accept") ?? "").includes("text/html");
}

app.notFound((c) => {
  if (wantsHtml(c)) return c.html(NOT_FOUND_HTML, 404);
  return c.json({ error: "not found", code: "not_found", docs: "https://agentmemo.dev/docs" }, 404);
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error("unhandled error", err);
  if (wantsHtml(c)) return c.html(ERROR_HTML, 500);
  return c.json(
    { error: "internal server error", code: "internal_error", docs: "https://agentmemo.dev/docs" },
    500,
  );
});

export default app;
