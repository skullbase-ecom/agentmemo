import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, requireString } from "../lib/http";
import { generateApiKey, sha256Hex } from "../lib/crypto";
import { sendWelcomeEmail } from "../lib/email";
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
 * POST /signup — public self-serve registration. No admin secret required.
 * Creates a free-tier API key and returns it once. Rate limited per IP.
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
  const email = requireString(body.email, "email", 256);
  if (!EMAIL_RE.test(email)) fail(400, "'email' must be a valid email address");

  const { id, secret } = generateApiKey();
  const keyHash = await sha256Hex(secret);
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO api_keys (id, key_hash, name, owner, scopes, tier, source, monthly_usage, usage_reset_date, created_at)
     VALUES (?, ?, ?, ?, 'read,write', 'free', 'self-serve', 0, ?, ?)`,
  )
    .bind(id, keyHash, name, email, nextMonthReset(now), now)
    .run();

  // Fire welcome email without blocking the response.
  const emailSent = await sendWelcomeEmail(c.env, email, secret, name).catch(() => false);

  return c.json(
    {
      id,
      key: secret, // shown exactly once
      name,
      email,
      tier: "free",
      scopes: ["read", "write"],
      limits: { operations_per_month: 10000 },
      welcome_email_sent: emailSent,
      docs: "https://agentmemo.dev/docs",
      created_at: now,
    },
    201,
  );
});

export default signup;
