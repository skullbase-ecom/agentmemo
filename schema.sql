-- AgentMemo D1 schema
-- Idempotent: safe to run repeatedly (used by `wrangler d1 execute ... --file=schema.sql`).

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- API keys issued to developers. We store only a SHA-256 hash of the key;
-- the plaintext is returned exactly once at creation time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT PRIMARY KEY,            -- public key id (am_pk_...)
  key_hash      TEXT NOT NULL UNIQUE,        -- sha256 hex of the secret key
  name          TEXT NOT NULL,               -- human label for the key
  owner         TEXT,                        -- developer email / identifier
  scopes        TEXT NOT NULL DEFAULT 'read,write',
  tier          TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  source        TEXT NOT NULL DEFAULT 'admin', -- 'admin' | 'self-serve'
  monthly_usage    INTEGER NOT NULL DEFAULT 0,  -- billable operations this period
  usage_reset_date INTEGER,                     -- unix ms when monthly_usage resets
  rate_limit    INTEGER NOT NULL DEFAULT 0,  -- 0 = unlimited (informational)
  revoked       INTEGER NOT NULL DEFAULT 0,  -- 0/1
  created_at    INTEGER NOT NULL,            -- unix ms
  last_used_at  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys (owner);

-- ---------------------------------------------------------------------------
-- Stored agent memories. Each memory is scoped to (api_key, user, agent).
-- The embedding is stored as a JSON array of floats for in-worker cosine
-- similarity ranking.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memories (
  id          TEXT PRIMARY KEY,              -- mem_...
  api_key_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  agent_id    TEXT NOT NULL,
  content     TEXT NOT NULL,
  metadata    TEXT NOT NULL DEFAULT '{}',    -- JSON object
  embedding   TEXT,                          -- JSON float[] (nullable if AI unavailable)
  created_at  INTEGER NOT NULL,              -- unix ms
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memories_scope
  ON memories (api_key_id, user_id, agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_memories_user
  ON memories (api_key_id, user_id);

-- ---------------------------------------------------------------------------
-- Per-request usage log. One row per billable API call. Aggregated by /usage.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_events (
  id          TEXT PRIMARY KEY,              -- evt_...
  api_key_id  TEXT NOT NULL,
  route       TEXT NOT NULL,                 -- e.g. POST /memory/store
  status      INTEGER NOT NULL,              -- http status returned
  tokens      INTEGER NOT NULL DEFAULT 0,    -- embedding tokens (approx)
  latency_ms  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,              -- unix ms
  day         TEXT NOT NULL,                 -- YYYY-MM-DD (UTC) for cheap grouping
  FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_key_time
  ON usage_events (api_key_id, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_key_day
  ON usage_events (api_key_id, day);
