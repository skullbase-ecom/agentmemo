import type { Env } from "../types";
import { usageId } from "./ids";

// Audit log + per-key trust (OWASP ASI06 foundation).

export interface TrustState {
  trust_score: number;
  blocked: boolean;
}

export async function getAgentTrust(env: Env, keyId: string): Promise<TrustState> {
  const row = await env.DB.prepare(
    `SELECT trust_score, blocked FROM agent_trust WHERE api_key_id = ?`,
  )
    .bind(keyId)
    .first<{ trust_score: number; blocked: number }>()
    .catch(() => null);
  return { trust_score: row?.trust_score ?? 1.0, blocked: (row?.blocked ?? 0) === 1 };
}

/** Upsert a write into agent_trust (total_writes++, last_activity). */
export async function recordWrite(env: Env, keyId: string, now: number): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO agent_trust (api_key_id, trust_score, total_writes, last_activity)
     VALUES (?, 1.0, 1, ?)
     ON CONFLICT(api_key_id) DO UPDATE SET total_writes = total_writes + 1, last_activity = excluded.last_activity`,
  )
    .bind(keyId, now)
    .run()
    .catch(() => {});
}

/** Append an entry to the audit log (fire-and-forget). */
export async function audit(
  env: Env,
  entry: {
    memory_id?: string | null;
    action: string;
    api_key_id: string;
    trust_score?: number | null;
    ip_hash?: string | null;
    outcome?: string | null;
    now: number;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO memory_audit (id, memory_id, action, api_key_id, trust_score, timestamp, ip_hash, outcome)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      usageId(),
      entry.memory_id ?? null,
      entry.action,
      entry.api_key_id,
      entry.trust_score ?? null,
      entry.now,
      entry.ip_hash ?? null,
      entry.outcome ?? null,
    )
    .run()
    .catch(() => {});
}
