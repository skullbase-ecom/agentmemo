import type { Env } from "./types";

// Daily operations digest, emailed to the operators at 10:00 IST (04:30 UTC).
// Pulls signup + system-state metrics straight from D1 and sends via Resend.
//
// Required config:
//   RESEND_API_KEY      (secret)  — Resend API key (re_...)
//   REPORT_RECIPIENTS   (secret)  — comma-separated To: addresses
//   REPORT_FROM         (var)     — From: header, default reports@agentmemo.dev

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60_000; // UTC+05:30

async function scalar(env: Env, sql: string, ...binds: unknown[]): Promise<number> {
  const r = await env.DB.prepare(sql)
    .bind(...binds)
    .first<{ n: number }>()
    .catch(() => null);
  return r?.n ?? 0;
}

async function rows<T>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  const r = await env.DB.prepare(sql)
    .bind(...binds)
    .all<T>()
    .catch(() => ({ results: [] as T[] }));
  return r.results ?? [];
}

/** The IST calendar date (YYYY-MM-DD) for a UTC timestamp. */
function istDate(now: number): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** HH:MM IST for a UTC timestamp. */
function istTime(ts: number): string {
  return new Date(ts + IST_OFFSET_MS).toISOString().slice(11, 16);
}

interface Signup {
  name: string;
  tier: string;
  source: string;
  owner: string | null;
  created_at: number;
}
interface RouteStat {
  route: string;
  n: number;
}

export interface ReportData {
  date: string;
  generated_at: number;
  signups24h: Signup[];
  agents: { active: number; total: number; revoked: number; pro: number };
  newSignups7d: number;
  memories: { total: number; today: number; activeAgents24h: number };
  types: { episodes: number; procedures: number; emotional: number };
  traffic: { requests: number; errors: number; avgLatency: number; tokens: number };
  topRoutes: RouteStat[];
  health: { db: "ok" | "error" };
}

export async function buildReport(env: Env, now: number): Promise<ReportData> {
  const since24h = now - DAY_MS;
  const since7d = now - 7 * DAY_MS;
  const startOfDayUtc = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );

  let db: "ok" | "error" = "ok";
  try {
    await env.DB.prepare("SELECT 1").first();
  } catch {
    db = "error";
  }

  const [
    signups24h,
    active,
    total,
    revoked,
    pro,
    newSignups7d,
    memTotal,
    memToday,
    activeAgents24h,
    episodes,
    procedures,
    emotional,
    requests,
    errors,
    avgLatency,
    tokens,
    topRoutes,
  ] = await Promise.all([
    rows<Signup>(
      env,
      "SELECT name, tier, source, owner, created_at FROM api_keys WHERE created_at > ? ORDER BY created_at DESC LIMIT 50",
      since24h,
    ),
    scalar(env, "SELECT COUNT(*) AS n FROM api_keys WHERE revoked = 0"),
    scalar(env, "SELECT COUNT(*) AS n FROM api_keys"),
    scalar(env, "SELECT COUNT(*) AS n FROM api_keys WHERE revoked = 1"),
    scalar(env, "SELECT COUNT(*) AS n FROM api_keys WHERE revoked = 0 AND tier = 'pro'"),
    scalar(env, "SELECT COUNT(*) AS n FROM api_keys WHERE created_at > ?", since7d),
    scalar(env, "SELECT COUNT(*) AS n FROM memories"),
    scalar(env, "SELECT COUNT(*) AS n FROM memories WHERE created_at >= ?", startOfDayUtc),
    scalar(env, "SELECT COUNT(DISTINCT agent_id) AS n FROM memories WHERE created_at > ?", since24h),
    scalar(env, "SELECT COUNT(*) AS n FROM episodes"),
    scalar(env, "SELECT COUNT(*) AS n FROM procedures"),
    scalar(env, "SELECT COUNT(*) AS n FROM emotional_memories"),
    scalar(env, "SELECT COUNT(*) AS n FROM usage_events WHERE created_at > ?", since24h),
    scalar(env, "SELECT COUNT(*) AS n FROM usage_events WHERE created_at > ? AND status >= 400", since24h),
    scalar(
      env,
      "SELECT CAST(COALESCE(AVG(latency_ms),0) AS INTEGER) AS n FROM usage_events WHERE created_at > ?",
      since24h,
    ),
    scalar(env, "SELECT COALESCE(SUM(tokens),0) AS n FROM usage_events WHERE created_at > ?", since24h),
    rows<RouteStat>(
      env,
      "SELECT route, COUNT(*) AS n FROM usage_events WHERE created_at > ? GROUP BY route ORDER BY n DESC LIMIT 6",
      since24h,
    ),
  ]);

  return {
    date: istDate(now),
    generated_at: now,
    signups24h,
    agents: { active, total, revoked, pro },
    newSignups7d,
    memories: { total: memTotal, today: memToday, activeAgents24h },
    types: { episodes, procedures, emotional },
    traffic: { requests, errors, avgLatency, tokens },
    topRoutes,
    health: { db },
  };
}

const num = (n: number) => n.toLocaleString("en-US");

export function renderText(d: ReportData): string {
  const lines: string[] = [];
  lines.push(`AgentMemo — Daily Report — ${d.date} (10:00 IST)`);
  lines.push("=".repeat(48));
  lines.push("");
  lines.push(`NEW AGENTS (last 24h): ${d.signups24h.length}`);
  if (d.signups24h.length) {
    for (const s of d.signups24h) {
      const who = s.owner ? ` <${s.owner}>` : "";
      lines.push(`  • ${s.name}${who} — ${s.tier} via ${s.source} at ${istTime(s.created_at)} IST`);
    }
  } else {
    lines.push("  (none)");
  }
  lines.push("");
  lines.push("AGENTS");
  lines.push(`  Active: ${num(d.agents.active)}   Pro: ${num(d.agents.pro)}   Revoked: ${num(d.agents.revoked)}   Total ever: ${num(d.agents.total)}`);
  lines.push(`  New in last 7 days: ${num(d.newSignups7d)}`);
  lines.push("");
  lines.push("MEMORY");
  lines.push(`  Total memories: ${num(d.memories.total)}   Stored today: ${num(d.memories.today)}   Active agents 24h: ${num(d.memories.activeAgents24h)}`);
  lines.push(`  Episodes: ${num(d.types.episodes)}   Procedures: ${num(d.types.procedures)}   Emotional: ${num(d.types.emotional)}`);
  lines.push("");
  lines.push("TRAFFIC (last 24h)");
  lines.push(`  Requests: ${num(d.traffic.requests)}   Errors: ${num(d.traffic.errors)}   Avg latency: ${num(d.traffic.avgLatency)}ms   Embed tokens: ${num(d.traffic.tokens)}`);
  if (d.topRoutes.length) {
    lines.push("  Top routes:");
    for (const r of d.topRoutes) lines.push(`    ${r.route} — ${num(r.n)}`);
  }
  lines.push("");
  lines.push(`SYSTEM: database ${d.health.db === "ok" ? "healthy ✓" : "ERROR ✗"}`);
  lines.push("");
  lines.push("— AgentMemo ops · https://agentmemo.dev/observatory");
  return lines.join("\n");
}

export function renderHtml(d: ReportData): string {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const signupRows = d.signups24h.length
    ? d.signups24h
        .map(
          (s) =>
            `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(s.name)}${s.owner ? `<br><span style="color:#888;font-size:12px">${esc(s.owner)}</span>` : ""}</td><td style="padding:6px 10px;border-bottom:1px solid #eee"><span style="background:${s.tier === "pro" ? "#7c3aed" : "#e5e7eb"};color:${s.tier === "pro" ? "#fff" : "#111"};border-radius:6px;padding:2px 8px;font-size:12px">${esc(s.tier)}</span></td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666">${esc(s.source)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666">${istTime(s.created_at)} IST</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" style="padding:10px;color:#888">No new agents in the last 24 hours.</td></tr>`;

  const stat = (label: string, value: string, accent = false) =>
    `<td style="padding:14px;background:#fafafa;border:1px solid #eee;border-radius:10px;text-align:center"><div style="font-size:24px;font-weight:800;color:${accent ? "#7c3aed" : "#111"}">${value}</div><div style="font-size:12px;color:#777;margin-top:2px">${label}</div></td>`;

  const routeList = d.topRoutes
    .map(
      (r) =>
        `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #f1f1f1"><span style="color:#444;font-family:ui-monospace,monospace">${esc(r.route)}</span><span style="color:#888">${num(r.n)}</span></div>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
<div style="max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#fff;border:1px solid #eaeaea;border-radius:16px;overflow:hidden">
    <div style="padding:22px 24px;background:linear-gradient(90deg,#6d28d9,#4f46e5);color:#fff">
      <div style="font-size:13px;opacity:.85;letter-spacing:.5px">AGENTMEMO · DAILY REPORT</div>
      <div style="font-size:22px;font-weight:800;margin-top:2px">${d.date} · 10:00 IST</div>
    </div>
    <div style="padding:24px">
      <h2 style="font-size:15px;margin:0 0 10px">New agents (last 24h) — ${num(d.signups24h.length)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left;color:#888;font-size:12px"><th style="padding:0 10px 6px">Agent</th><th style="padding:0 10px 6px">Tier</th><th style="padding:0 10px 6px">Source</th><th style="padding:0 10px 6px">When</th></tr></thead><tbody>${signupRows}</tbody></table>

      <h2 style="font-size:15px;margin:22px 0 10px">Agents</h2>
      <table style="width:100%;border-collapse:separate;border-spacing:8px"><tr>${stat("Active", num(d.agents.active))}${stat("Pro", num(d.agents.pro), true)}${stat("New (7d)", num(d.newSignups7d))}${stat("Revoked", num(d.agents.revoked))}</tr></table>

      <h2 style="font-size:15px;margin:22px 0 10px">Memory</h2>
      <table style="width:100%;border-collapse:separate;border-spacing:8px"><tr>${stat("Total memories", num(d.memories.total))}${stat("Stored today", num(d.memories.today))}${stat("Active agents 24h", num(d.memories.activeAgents24h))}</tr><tr>${stat("Episodes", num(d.types.episodes))}${stat("Procedures", num(d.types.procedures))}${stat("Emotional", num(d.types.emotional))}</tr></table>

      <h2 style="font-size:15px;margin:22px 0 10px">Traffic (last 24h)</h2>
      <table style="width:100%;border-collapse:separate;border-spacing:8px"><tr>${stat("Requests", num(d.traffic.requests))}${stat("Errors", num(d.traffic.errors), d.traffic.errors > 0)}${stat("Avg latency", num(d.traffic.avgLatency) + "ms")}${stat("Embed tokens", num(d.traffic.tokens))}</tr></table>
      ${routeList ? `<div style="margin-top:12px"><div style="font-size:12px;color:#888;margin-bottom:4px">Top routes</div>${routeList}</div>` : ""}

      <div style="margin-top:22px;padding:12px 14px;border-radius:10px;background:${d.health.db === "ok" ? "#ecfdf5" : "#fef2f2"};color:${d.health.db === "ok" ? "#065f46" : "#991b1b"};font-size:14px;font-weight:600">System: database ${d.health.db === "ok" ? "healthy ✓" : "ERROR ✗"}</div>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#999">AgentMemo ops digest · <a href="https://agentmemo.dev/observatory" style="color:#7c3aed">Observatory</a> · <a href="https://agentmemo.dev/status" style="color:#7c3aed">Status</a></div>
  </div>
</div></body></html>`;
}

/** Send the daily report via Resend. Returns a result for logging/inspection. */
export async function sendReport(
  env: Env,
  now: number,
  overrideTo?: string[],
): Promise<{ ok: boolean; status: number; skipped?: string; body?: unknown }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 0, skipped: "RESEND_API_KEY not configured" };

  const to = (overrideTo && overrideTo.length ? overrideTo : (env.REPORT_RECIPIENTS ?? "").split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) return { ok: false, status: 0, skipped: "REPORT_RECIPIENTS not configured" };

  const from = env.REPORT_FROM || "AgentMemo Reports <reports@agentmemo.dev>";
  const data = await buildReport(env, now);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `AgentMemo Daily — ${data.date} — ${data.signups24h.length} new agent${data.signups24h.length === 1 ? "" : "s"}`,
      html: renderHtml(data),
      text: renderText(data),
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}
