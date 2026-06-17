-- Optional local seed data. Run AFTER schema.sql:
--   npm run db:seed:local
--
-- This inserts a demo API key whose plaintext secret is:
--   am_sk_DEMO_LOCAL_KEY_DO_NOT_USE_IN_PROD
-- key_hash below is sha256("am_sk_DEMO_LOCAL_KEY_DO_NOT_USE_IN_PROD").

INSERT OR IGNORE INTO api_keys (id, key_hash, name, owner, scopes, created_at)
VALUES (
  'am_pk_demo000000000000',
  'd3d042a2635411e016127b4c1546eef97fedfe5e04893629ff7365632fd34c67',
  'demo-local-key',
  'dev@example.com',
  'read,write',
  0
);
