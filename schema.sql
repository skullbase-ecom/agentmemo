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
  importance  INTEGER NOT NULL DEFAULT 0,    -- 0..10, boosts ranking / compression priority
  expires_at  INTEGER,                       -- unix ms; memory ignored after this
  tags        TEXT,                          -- comma-separated tags
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

-- ---------------------------------------------------------------------------
-- PHASE 1: MEMORY TYPES
-- ---------------------------------------------------------------------------

-- Episodic memory: ordered sessions of events.
CREATE TABLE IF NOT EXISTS episodes (
  id          TEXT PRIMARY KEY,             -- ep_...
  api_key_id  TEXT NOT NULL,
  agent_id    TEXT NOT NULL,
  user_id     TEXT,
  title       TEXT,
  status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  summary     TEXT,
  event_count INTEGER NOT NULL DEFAULT 0,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_episodes_scope ON episodes (api_key_id, agent_id, started_at);

CREATE TABLE IF NOT EXISTS episode_events (
  id          TEXT PRIMARY KEY,             -- evt_...
  episode_id  TEXT NOT NULL,
  api_key_id  TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  type        TEXT NOT NULL DEFAULT 'event',
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_episode_events ON episode_events (episode_id, seq);

-- Procedural memory: how to do things (steps), matched semantically.
CREATE TABLE IF NOT EXISTS procedures (
  id          TEXT PRIMARY KEY,             -- proc_...
  api_key_id  TEXT NOT NULL,
  agent_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  steps       TEXT NOT NULL DEFAULT '[]',   -- JSON array of step strings
  trigger     TEXT,                         -- when to use this procedure
  embedding   TEXT,                         -- JSON float[] for matching
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_procedures_scope ON procedures (api_key_id, agent_id);

-- Emotional memory: sentiment of interactions, per user.
CREATE TABLE IF NOT EXISTS emotional_memories (
  id          TEXT PRIMARY KEY,             -- emo_...
  api_key_id  TEXT NOT NULL,
  agent_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  sentiment   TEXT NOT NULL,                -- 'positive' | 'negative' | 'neutral'
  intensity   INTEGER NOT NULL DEFAULT 5,   -- 1..10
  note        TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emotional_scope ON emotional_memories (api_key_id, agent_id, user_id);

-- ---------------------------------------------------------------------------
-- PHASE 2: INTELLIGENCE LAYER
-- ---------------------------------------------------------------------------

-- Memory graph: typed links between memories.
CREATE TABLE IF NOT EXISTS memory_links (
  id           TEXT PRIMARY KEY,            -- lnk_...
  api_key_id   TEXT NOT NULL,
  from_id      TEXT NOT NULL,
  to_id        TEXT NOT NULL,
  relationship TEXT NOT NULL,               -- contradicts|supports|follows|causes|related_to
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_links_from ON memory_links (api_key_id, from_id);
CREATE INDEX IF NOT EXISTS idx_links_rel ON memory_links (api_key_id, relationship);

-- Agent identity: agents as first-class citizens under an API key.
CREATE TABLE IF NOT EXISTS agents (
  id           TEXT PRIMARY KEY,            -- agt_...
  api_key_id   TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  capabilities TEXT,                        -- JSON array
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agents_key ON agents (api_key_id);

-- Registered webhooks.
CREATE TABLE IF NOT EXISTS webhooks (
  id          TEXT PRIMARY KEY,             -- wh_...
  api_key_id  TEXT NOT NULL,
  url         TEXT NOT NULL,
  events      TEXT NOT NULL,                -- comma-separated event names
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhooks_key ON webhooks (api_key_id);

-- Semantic memory enhancements (importance, TTL, tags) live on `memories`:
--   ALTER TABLE memories ADD COLUMN importance INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE memories ADD COLUMN expires_at INTEGER;
--   ALTER TABLE memories ADD COLUMN tags TEXT;
-- (Included in the CREATE below for fresh installs.)
