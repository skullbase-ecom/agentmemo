import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString } from "../lib/http";
import { generateApiKey, sha256Hex } from "../lib/crypto";
import { bumpRateWindow, signupRateLimitPerHour, nextMonthReset } from "../lib/quota";
import { SIGNUP_HTML } from "../signup-page";

const signup = new Hono<{ Bindings: Env; Variables: Variables }>();

interface SignupBody {
  name?: unknown;
  email?: unknown;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** GET /signup — human-facing self-serve signup page. */
signup.get("/", (c) => {
  c.header("cache-control", "public, max-age=3600");
  return c.html(SIGNUP_HTML);
});

/**
 * POST /signup — public, agent-first self-serve registration. No admin secret,
 * no email, no verification. Returns a free-tier API key directly in the JSON
 * response. `email` is optional and stored for our records only — never required
 * for an agent to register. Rate limited per IP.
 */
signup.post("/", async (c) => {
  // Rate limit: max N signups per IP per hour.
  const ip =
    c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
  const perHour = signupRateLimitPerHour(c.env);
  const count = await bumpRateWindow(c.env, `signup:${ip}`, 3600, Date.now());
  if (count > perHour) {
    fail(429, `Too many signups from this IP (max ${perHour}/hour). Try again later.`);
  }

  const body = (await c.req.json().catch(() => fail(400, "invalid JSON body"))) as SignupBody;
  const name = requireString(body.name, "name", 200);

  // Email is optional. If provided it must be valid; stored for our records only.
  let email: string | null = null;
  if (body.email !== undefined && body.email !== null && body.email !== "") {
    email = requireString(body.email, "email", 256);
    if (!EMAIL_RE.test(email)) fail(400, "'email' must be a valid email address");
  }

  const { id, secret } = generateApiKey();
  const keyHash = await sha256Hex(secret);
  const now = Date.now();
  const reset = nextMonthReset(now);

  await c.env.DB.prepare(
    `INSERT INTO api_keys (id, key_hash, name, owner, scopes, tier, source, monthly_usage, usage_reset_date, created_at)
     VALUES (?, ?, ?, ?, 'read,write', 'free', 'self-serve', 0, ?, ?)`,
  )
    .bind(id, keyHash, name, email, reset, now)
    .run();

  // Key is delivered in the HTTP response — agent-first, zero human interaction.
  return c.json(
    {
      id,
      api_key: secret, // shown exactly once
      tier: "free",
      limit: 10000,
      scopes: ["read", "write"],
      upgrade_url: "https://checkout.dodopayments.com/buy/pdt_0NhKvw8RSLuiPu2bD2IQH?quantity=1",
      upgrade_via_mcp: {
        description: "Agents can upgrade programmatically via Dodo Payments MCP",
        dodo_mcp: "https://mcp.dodopayments.com/sse",
        dodo_knowledge_mcp: "https://knowledge.dodopayments.com/mcp",
        product_id: "pdt_0NhKvw8RSLuiPu2bD2IQH",
        note: "Use your public key ID (am_pk_) not your secret key (am_sk_) in Dodo metadata. Your secret key stays secret.",
        subscription_metadata: { agentmemo_key_id: id },
        docs: "https://agentmemo.dev/docs/agent-payments",
      },
      docs: "https://agentmemo.dev/docs",
      mcp: "https://agentmemo.dev/mcp",
      created_at: now,
    },
    201,
  );
});

export default signup;
