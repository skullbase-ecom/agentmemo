import type { Context } from "hono";

/** Cloudflare bindings declared in wrangler.toml. */
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  EMBEDDING_MODEL: string;
  RETRIEVE_CACHE_TTL: string;
  AUTH_CACHE_TTL: string;
  RETRIEVE_CANDIDATE_LIMIT: string;
  FREE_TIER_MONTHLY_LIMIT: string;
  API_RATE_LIMIT_PER_MIN: string;
  SIGNUP_RATE_LIMIT_PER_HOUR: string;
  RESEND_SENDER?: string;
  RESEND_FROM?: string;
  // Secrets (wrangler secret put):
  ADMIN_SECRET?: string;
  RESEND_API_KEY?: string;
  DODO_WEBHOOK_SECRET?: string;
}

/** The authenticated API key, attached to the request context by auth middleware. */
export interface AuthedKey {
  id: string;
  name: string;
  owner: string | null;
  scopes: string[];
  tier: string;
}

/** Hono context variables we set during the request lifecycle. */
export type Variables = {
  apiKey: AuthedKey;
};

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

export interface MemoryRow {
  id: string;
  api_key_id: string;
  user_id: string;
  agent_id: string;
  content: string;
  metadata: string;
  embedding: string | null;
  created_at: number;
  updated_at: number;
}
