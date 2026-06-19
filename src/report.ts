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
  revoked: number;
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
      "SELECT name, tier, source, owner, revoked, created_at FROM api_keys WHERE created_at > ? ORDER BY created_at DESC LIMIT 50",
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
  const newActive = d.signups24h.filter((s) => !s.revoked).length;
  const newRevoked = d.signups24h.length - newActive;
  const lines: string[] = [];
  lines.push(`AgentMemo — Daily Report — ${d.date} (10:00 IST)`);
  lines.push("=".repeat(48));
  lines.push("");
  lines.push(
    `NEW AGENTS (last 24h): ${newActive} active` +
      (newRevoked ? ` (+${newRevoked} revoked)` : ""),
  );
  if (d.signups24h.length) {
    for (const s of d.signups24h) {
      const who = s.owner ? ` <${s.owner}>` : "";
      const flag = s.revoked ? " [REVOKED]" : "";
      lines.push(
        `  • ${s.name}${who} — ${s.tier} via ${s.source} at ${istTime(s.created_at)} IST${flag}`,
      );
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

// ---- Email rendering -------------------------------------------------------
// Built for real email clients (Gmail, Outlook, Apple Mail): table-based layout,
// inline styles only, no flexbox, no CSS grid, fixed 600px content width so
// nothing overflows. Gradients degrade to a solid background where unsupported.

const C = {
  bg: "#eef0f4",
  card: "#ffffff",
  ink: "#15151c",
  muted: "#6b6b78",
  faint: "#9a9aa6",
  line: "#ececf1",
  tile: "#f7f7fb",
  accent: "#6d28d9",
  accent2: "#4f46e5",
  good: "#047857",
  goodBg: "#ecfdf5",
  bad: "#b91c1c",
  badBg: "#fef2f2",
};

const escHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

interface Tile {
  label: string;
  value: string;
  accent?: boolean;
}

/** Render a row of stat tiles as a fixed-width table (no overflow, no flex). */
function tileRow(tiles: Tile[]): string {
  const w = (100 / tiles.length).toFixed(4);
  const cells = tiles
    .map(
      (t) =>
        `<td width="${w}%" valign="top" style="padding:5px">` +
        `<div style="background:${C.tile};border:1px solid ${C.line};border-radius:12px;padding:16px 10px;text-align:center">` +
        `<div style="font-size:25px;line-height:1;font-weight:800;color:${t.accent ? C.accent : C.ink}">${t.value}</div>` +
        `<div style="font-size:11px;color:${C.muted};margin-top:7px;text-transform:uppercase;letter-spacing:.04em">${t.label}</div>` +
        `</div></td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 -5px"><tr>${cells}</tr></table>`;
}

function tileRows(tiles: Tile[], perRow: number): string {
  let out = "";
  for (let i = 0; i < tiles.length; i += perRow) out += tileRow(tiles.slice(i, i + perRow));
  return out;
}

function sectionHeading(text: string): string {
  return `<tr><td style="padding:26px 0 12px"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.accent}">${text}</div></td></tr>`;
}

function pill(text: string, bg: string, fg: string): string {
  return `<span style="display:inline-block;background:${bg};color:${fg};border-radius:20px;padding:2px 9px;font-size:11px;font-weight:600;line-height:1.5">${text}</span>`;
}

export function renderHtml(d: ReportData): string {
  const newActive = d.signups24h.filter((s) => !s.revoked).length;
  const newRevoked = d.signups24h.length - newActive;

  const signupRows = d.signups24h.length
    ? d.signups24h
        .map((s, i) => {
          const rev = !!s.revoked;
          const top = i === 0 ? "" : `border-top:1px solid ${C.line};`;
          const nameColor = rev ? C.faint : C.ink;
          const tierPill = rev
            ? pill(`${escHtml(s.tier)} · revoked`, "#f3f4f6", C.faint)
            : s.tier === "pro"
              ? pill("pro", "#efe7fe", C.accent)
              : pill(escHtml(s.tier), "#eef0f4", C.muted);
          return (
            `<tr><td style="${top}padding:11px 4px;font-size:14px;color:${nameColor};font-weight:600${rev ? ";text-decoration:line-through" : ""}">${escHtml(s.name)}` +
            (s.owner
              ? `<div style="font-size:12px;color:${C.faint};font-weight:400;text-decoration:none;margin-top:1px">${escHtml(s.owner)}</div>`
              : "") +
            `</td>` +
            `<td style="${top}padding:11px 4px;text-align:right;white-space:nowrap">${tierPill}</td>` +
            `<td style="${top}padding:11px 4px;text-align:right;font-size:12px;color:${C.muted};white-space:nowrap">${escHtml(s.source)}</td>` +
            `<td style="${top}padding:11px 4px;text-align:right;font-size:12px;color:${C.muted};white-space:nowrap">${istTime(s.created_at)} IST</td>` +
            `</tr>`
          );
        })
        .join("")
    : `<tr><td style="padding:14px 4px;color:${C.faint};font-size:14px">No new agents in the last 24 hours.</td></tr>`;

  const routeRows = d.topRoutes
    .map(
      (r, i) =>
        `<tr><td style="${i ? `border-top:1px solid ${C.line};` : ""}padding:8px 4px;font-size:13px;color:${C.ink};font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escHtml(r.route)}</td>` +
        `<td style="${i ? `border-top:1px solid ${C.line};` : ""}padding:8px 4px;text-align:right;font-size:13px;color:${C.muted}">${num(r.n)}</td></tr>`,
    )
    .join("");

  const ok = d.health.db === "ok";
  const summaryStrip = `${newActive} new active agent${newActive === 1 ? "" : "s"} · ${num(d.agents.active)} total · ${num(d.memories.today)} memories stored today`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>AgentMemo Daily — ${d.date}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">AgentMemo daily ops digest for ${d.date} — ${summaryStrip}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border-collapse:collapse">
<tr><td align="center" style="padding:28px 16px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border-collapse:collapse;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <!-- header -->
    <tr><td style="padding:28px 32px;background-color:${C.accent};background-image:linear-gradient(135deg,${C.accent} 0%,${C.accent2} 100%)">
      <div style="font-size:12px;font-weight:600;letter-spacing:.12em;color:#e9e2ff;text-transform:uppercase">AgentMemo · Daily Report</div>
      <div style="font-size:26px;font-weight:800;color:#ffffff;margin-top:6px;letter-spacing:-.01em">${d.date}</div>
      <div style="font-size:13px;color:#d9d2f7;margin-top:4px">10:00 IST · ${summaryStrip}</div>
    </td></tr>
    <!-- body -->
    <tr><td style="padding:6px 32px 30px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">

        ${sectionHeading(`New agents — last 24h${newRevoked ? ` · ${newActive} active, ${newRevoked} revoked` : ""}`)}
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${signupRows}</table>
        </td></tr>

        ${sectionHeading("Agents")}
        <tr><td>${tileRow([
          { label: "Active", value: num(d.agents.active) },
          { label: "Pro", value: num(d.agents.pro), accent: true },
          { label: "New · 7d", value: num(d.newSignups7d) },
          { label: "Revoked", value: num(d.agents.revoked) },
        ])}</td></tr>

        ${sectionHeading("Memory")}
        <tr><td>${tileRows(
          [
            { label: "Total memories", value: num(d.memories.total) },
            { label: "Stored today", value: num(d.memories.today) },
            { label: "Active agents 24h", value: num(d.memories.activeAgents24h) },
            { label: "Episodes", value: num(d.types.episodes) },
            { label: "Procedures", value: num(d.types.procedures) },
            { label: "Emotional", value: num(d.types.emotional) },
          ],
          3,
        )}</td></tr>

        ${sectionHeading("Traffic · last 24h")}
        <tr><td>${tileRow([
          { label: "Requests", value: num(d.traffic.requests) },
          { label: "Errors", value: num(d.traffic.errors), accent: d.traffic.errors > 0 },
          { label: "Avg latency", value: num(d.traffic.avgLatency) + "ms" },
          { label: "Embed tokens", value: num(d.traffic.tokens) },
        ])}</td></tr>
        ${
          routeRows
            ? `<tr><td style="padding:14px 5px 0">
          <div style="font-size:11px;color:${C.muted};text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Top routes</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${routeRows}</table>
        </td></tr>`
            : ""
        }

        <tr><td style="padding:26px 0 0">
          <div style="background:${ok ? C.goodBg : C.badBg};border:1px solid ${ok ? "#bbf7d0" : "#fecaca"};border-radius:12px;padding:14px 16px;font-size:14px;font-weight:600;color:${ok ? C.good : C.bad}">
            ${ok ? "● System healthy — database responding" : "● System degraded — database error"}
          </div>
        </td></tr>

      </table>
    </td></tr>
    <!-- footer -->
    <tr><td style="padding:18px 32px;background:${C.tile};border-top:1px solid ${C.line}">
      <div style="font-size:12px;color:${C.faint}">
        AgentMemo operations digest ·
        <a href="https://agentmemo.dev/observatory" style="color:${C.accent};text-decoration:none">Observatory</a> ·
        <a href="https://agentmemo.dev/status" style="color:${C.accent};text-decoration:none">Status</a>
      </div>
    </td></tr>
  </table>
  <div style="font-size:11px;color:${C.faint};margin-top:14px">Sent daily at 10:00 IST · agentmemo.dev</div>
</td></tr>
</table>
</body></html>`;
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
  const newActive = data.signups24h.filter((s) => !s.revoked).length;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `AgentMemo Daily — ${data.date} — ${newActive} new agent${newActive === 1 ? "" : "s"}`,
      html: renderHtml(data),
      text: renderText(data),
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}
