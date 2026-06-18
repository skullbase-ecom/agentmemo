import type { Env } from "../types";
import { usageId } from "./ids";
import { bumpRateWindow } from "./quota";

// Audit log + per-key trust (OWASP ASI06). Trust starts at 1.0 and is adjusted
// by the decrement/increment heuristics below; writes are blocked under 0.3.

const DAY_MS = 86_400_000;

// Heuristic weights.
const BURST_THRESHOLD = 50; // writes/min
const BURST_PENALTY = 0.025;
const SPAM_THRESHOLD = 10; // identical content occurrences/day
const SPAM_PENALTY = 0.05;
const DAILY_BONUS = 0.01; // per day of normal use (contradiction penalty -0.03 applied at call site)

export interface TrustState {
  trust_score: number;
  blocked: boolean;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function getAgentTrust(env: Env, keyId: string): Promise<TrustState> {
  const row = await env.DB.prepare(`SELECT trust_score, blocked FROM agent_trust WHERE api_key_id = ?`)
    .bind(keyId)
    .first<{ trust_score: number; blocked: number }>()
    .catch(() => null);
  return { trust_score: row?.trust_score ?? 1.0, blocked: (row?.blocked ?? 0) === 1 };
}

/** Adjust trust by delta (clamped 0..1). Auto-blocks at <0.3, unblocks at >=0.5. */
export async function adjustTrust(
  env: Env,
  keyId: string,
  delta: number,
  now: number,
  flagged = false,
): Promise<void> {
  const row = await env.DB.prepare(`SELECT trust_score FROM agent_trust WHERE api_key_id = ?`)
    .bind(keyId)
    .first<{ trust_score: number }>()
    .catch(() => null);
  const next = clamp01((row?.trust_score ?? 1.0) + delta);
  const blocked = next < 0.3 ? 1 : next >= 0.5 ? 0 : undefined;
  await env.DB.prepare(
    `INSERT INTO agent_trust (api_key_id, trust_score, total_writes, flagged_writes, last_activity, blocked)
     VALUES (?, ?, 0, ?, ?, ?)
     ON CONFLICT(api_key_id) DO UPDATE SET trust_score = ?, flagged_writes = flagged_writes + ?,
       last_activity = ?${blocked !== undefined ? ", blocked = " + blocked : ""}`,
  )
    .bind(keyId, next, flagged ? 1 : 0, now, blocked ?? 0, next, flagged ? 1 : 0, now)
    .run()
    .catch(() => {});
}

/**
 * Record a write and apply the trust heuristics:
 * - burst >50/min  -> -0.025
 * - identical spam >10/day -> -0.05
 * - otherwise, +0.01/day of normal use (rewarded once per day)
 */
export async function recordWrite(env: Env, keyId: string, now: number, contentHash?: string): Promise<void> {
  let penalty = 0;
  let flagged = false;

  const perMin = await bumpRateWindow(env, `tw:${keyId}`, 60, now);
  if (perMin > BURST_THRESHOLD) { penalty += BURST_PENALTY; flagged = true; }

  if (contentHash) {
    const sameContent = await bumpRateWindow(env, `spam:${keyId}:${contentHash.slice(0, 24)}`, 86_400, now);
    if (sameContent > SPAM_THRESHOLD) { penalty += SPAM_PENALTY; flagged = true; }
  }

  const row = await env.DB.prepare(
    `SELECT trust_score, last_activity FROM agent_trust WHERE api_key_id = ?`,
  )
    .bind(keyId)
    .first<{ trust_score: number; last_activity: number | null }>()
    .catch(() => null);
  const cur = row?.trust_score ?? 1.0;
  const last = row?.last_activity ?? 0;
  const bonus = !flagged && last && now - last >= DAY_MS ? DAILY_BONUS : 0;

  const next = clamp01(cur + bonus - penalty);
  const blocked = next < 0.3 ? 1 : next >= 0.5 ? 0 : 0;

  await env.DB.prepare(
    `INSERT INTO agent_trust (api_key_id, trust_score, total_writes, flagged_writes, last_activity, blocked)
     VALUES (?, ?, 1, ?, ?, ?)
     ON CONFLICT(api_key_id) DO UPDATE SET trust_score = ?, total_writes = total_writes + 1,
       flagged_writes = flagged_writes + ?, last_activity = ?, blocked = ?`,
  )
    .bind(keyId, next, flagged ? 1 : 0, now, blocked, next, flagged ? 1 : 0, now, blocked)
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
    .bind(usageId(), entry.memory_id ?? null, entry.action, entry.api_key_id, entry.trust_score ?? null, entry.now, entry.ip_hash ?? null, entry.outcome ?? null)
    .run()
    .catch(() => {});
}
