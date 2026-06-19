import { Hono } from "hono";
import type { Env, Variables } from "./types";
import { timingSafeEqual } from "./lib/crypto";
import { bumpRateWindow } from "./lib/quota";
import { summarize } from "./lib/ai";

// Admin intelligence console served on nadeem.agentmemo.dev. 100% real data from
// D1 + KV. Empty states where data doesn't exist yet — never mock numbers.

const admin = new Hono<{ Bindings: Env; Variables: Variables }>();

// ---- data helpers -------------------------------------------------------
async function scalar(env: Env, sql: string, ...b: unknown[]): Promise<number> {
  const r = await env.DB.prepare(sql).bind(...b).first().catch(() => null);
  return r ? Number(Object.values(r)[0] ?? 0) || 0 : 0;
}
async function rowsOf<T = Record<string, unknown>>(env: Env, sql: string, ...b: unknown[]): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...b).all<T>().catch(() => ({ results: [] as T[] }));
  return r.results ?? [];
}
const DAY = 86_400_000;
function startOfDay(now: number): number {
  return Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
}
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function ago(ts: number | null): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}
function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

const CAT_COLORS: Record<string, string> = {
  user_preference: "#00ff88", preferences: "#00ff88", operational: "#0099ff",
  factual: "#ffaa00", facts: "#ffaa00", procedural: "#8b5cf6", emotional: "#ff69b4",
  people: "#ff69b4", tasks: "#00ff88", events: "#ffaa00", technical: "#0099ff",
  commerce: "#ec4899", location: "#00ff88", health: "#ff4444", other: "#888888",
};
const catColor = (c: string) => CAT_COLORS[c] ?? "#888888";

// 7-day daily counts (fills gaps with 0).
async function dailySeries(env: Env, now: number): Promise<number[]> {
  const start = startOfDay(now) - 6 * DAY;
  const rows = await rowsOf<{ d: number; n: number }>(
    env,
    `SELECT (created_at/86400000) AS d, COUNT(*) AS n FROM memories WHERE created_at >= ? GROUP BY d`,
    start,
  );
  const map = new Map(rows.map((r) => [Number(r.d), Number(r.n)]));
  const out: number[] = [];
  for (let i = 0; i < 7; i++) out.push(map.get(Math.floor((start + i * DAY) / DAY)) ?? 0);
  return out;
}
function spark(vals: number[]): string {
  if (!vals.length || vals.every((v) => v === 0)) return `<span class="spark-empty">no data</span>`;
  const max = Math.max(1, ...vals);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1 || 1)) * 100},${24 - (v / max) * 21 - 2}`).join(" ");
  return `<svg viewBox="0 0 100 24" preserveAspectRatio="none" class="spark"><polyline points="${pts}" fill="none" stroke="#8b5cf6" stroke-width="2"/></svg>`;
}

// ---- shell --------------------------------------------------------------
const NAVS: [string, string][] = [
  ["/", "Brief"], ["/agents", "Agents"], ["/memories", "Memories"], ["/revenue", "Revenue"],
  ["/security", "Security"], ["/patterns", "Patterns"], ["/logs", "Logs"], ["/settings", "Settings"],
];
const MOBILE: [string, string][] = [["/", "Brief"], ["/agents", "Agents"], ["/memories", "Mem"], ["/security", "Sec"], ["/settings", "More"]];
// Per-section accent for the active sidebar item (neon coding aesthetic).
const NAV_C: Record<string, string> = {
  "/": "#8b5cf6", "/agents": "#00ff88", "/memories": "#0099ff", "/revenue": "#ffaa00",
  "/security": "#ff4444", "/patterns": "#ff69b4", "/logs": "#888888", "/settings": "#888888",
};

const ADMIN_CSS = `
:root{--bg:#050505;--panel:#0d0d0d;--card:#111111;--bd:#222222;--bd2:#2a2a2a;--tx:#ffffff;--tx2:#e0e0e0;--tx3:#888888;--tx4:#555555;--ac:#8b5cf6;--ok:#00ff88;--warn:#ffaa00;--err:#ff4444;--blue:#0099ff;--pink:#ff69b4;--active-bg:#1a1040;--hover:#1a1a1a;--track:#0a0a0a;--row-alt:#0d0d0d;--mono:'JetBrains Mono',ui-monospace,monospace;--sans:'Inter',system-ui,sans-serif}
[data-theme=light]{--bg:#ffffff;--panel:#f8f8f8;--card:#f8f8f8;--bd:#e5e5e5;--bd2:#d4d4d4;--tx:#0a0a0a;--tx2:#525252;--tx3:#737373;--tx4:#8a8a8a;--active-bg:#ede9fe;--hover:#f0f0f0;--track:#e5e5e5;--row-alt:#f0f0f0}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx2);font-family:var(--sans);-webkit-font-smoothing:antialiased;transition:background .2s,color .2s}
a{color:inherit;text-decoration:none}
.layout{display:flex;min-height:100vh}
.side{width:200px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--bd);padding:24px 0;position:sticky;top:0;height:100vh;display:flex;flex-direction:column}
.side .logo{padding:0 22px 22px;font-weight:700;color:var(--tx);font-size:16px}
.side .logo b{color:var(--ac)}
.side a{display:block;padding:9px 19px;color:var(--tx3);font-size:14px;border-left:3px solid transparent;transition:.2s}
.side a:hover{color:var(--tx);background:var(--hover)}
.side a.on{color:var(--na,var(--ac));background:var(--active-bg);border-left:3px solid var(--na,var(--ac));font-weight:600}
.side .sp{flex:1}
.side .ft{padding:14px 22px 0;border-top:1px solid var(--bd);font-size:13px}
.side .ft a{padding:6px 0;color:var(--tx3)}
.topbar{position:fixed;top:14px;right:18px;display:flex;align-items:center;gap:14px;z-index:60}
.topbar .lg{font-size:13px;font-weight:600;color:var(--tx3)}
.topbar .lg:hover{color:var(--err)}
.theme-tg{width:34px;height:34px;border-radius:9px;border:1px solid var(--bd);background:var(--card);color:var(--tx2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s}
.theme-tg:hover{border-color:var(--ac);color:var(--ac)}
.theme-tg svg{width:17px;height:17px}
.ic-sun{display:none}.ic-moon{display:block}
[data-theme=light] .ic-moon{display:none}[data-theme=light] .ic-sun{display:block}
.main{flex:1;min-width:0;padding:36px 40px 90px}
h1{color:var(--tx);font-size:24px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px}
.sub{color:var(--tx3);font-size:14px;margin-bottom:28px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:22px;margin-bottom:16px}
.headline{background:linear-gradient(180deg,var(--card),var(--bg));border:1px solid var(--bd);border-radius:14px;padding:26px;font-size:18px;line-height:1.6;color:var(--tx);margin-bottom:26px}
.pulse{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.pcell{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px}
.pcell .n{font-size:2rem;font-weight:800;color:var(--tx);letter-spacing:-.02em}
.pcell .l{color:var(--tx3);font-size:11px;margin-top:4px;text-transform:uppercase;letter-spacing:.06em}
.spark{width:100%;height:24px;margin-top:10px;display:block}
.spark-empty{color:var(--tx3);font-size:11px}
.story .card{border-left:3px solid var(--ac)}
.story .card h3{color:var(--tx);font-size:15px;margin-bottom:10px}
.story .card p{font-size:14px;line-height:1.6;color:var(--tx2);margin-bottom:14px}
.btn{display:inline-block;background:var(--ac);color:#fff;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;border:0;cursor:pointer;margin-right:8px}
.btn:hover{filter:brightness(1.12)}
.btn.ghost{background:transparent;border:1px solid var(--ac);color:var(--ac)}
.btn.danger{background:var(--err)}
.empty{text-align:center;color:var(--tx3);padding:48px 20px;border:1px dashed var(--bd2);border-radius:12px}
.empty b{color:var(--tx2);display:block;margin-bottom:6px;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.bartrk{height:8px;background:var(--track);border-radius:5px;overflow:hidden;margin:4px 0}
.barfl{height:100%;border-radius:5px}
.donut{width:160px;height:160px;border-radius:50%;flex-shrink:0}
.donut-c{width:90px;height:90px;border-radius:50%;background:var(--bg);position:absolute;inset:35px}
.legend span{display:flex;align-items:center;gap:8px;font-size:13px;margin:5px 0}
.legend .sw{width:10px;height:10px;border-radius:3px}
.mem{background:var(--card);border:1px solid var(--bd);border-left:3px solid var(--ac);border-radius:8px;padding:14px 16px;margin-bottom:10px}
.mem .hdr{font-size:12px;color:var(--tx4);font-family:var(--mono);margin-bottom:6px}
.mem .tags span{display:inline-block;font-size:11px;background:transparent;border:1px solid var(--bd2);border-radius:5px;padding:1px 7px;margin-right:6px;color:var(--tx2)}
.mem .body{color:var(--tx2);font-size:14px;margin:8px 0;line-height:1.5}
.mem .ftr{font-size:12px;color:var(--tx4);font-family:var(--mono)}
.agent{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px;margin-bottom:14px}
.agent .top{display:flex;justify-content:space-between;align-items:center}
.agent .id{color:var(--tx);font-weight:600;font-family:var(--mono)}
.badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}
.badge.pro{background:var(--ac);color:#fff}
.badge.free{background:#333;color:#888}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;color:var(--tx3);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;border-bottom:1px solid var(--bd)}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--bd);font-family:var(--mono);color:var(--tx2)}
.tbl tr:nth-child(even) td{background:var(--row-alt)}
.tbl tr:hover td{background:var(--active-bg)}
.big{font-size:64px;font-weight:800;color:var(--tx);text-align:center;letter-spacing:-.03em}
.statusline{display:flex;align-items:center;gap:12px;font-size:18px;color:var(--tx);font-weight:600}
.dot{width:12px;height:12px;border-radius:50%}
.dot.crit{animation:pulsedot 1.1s infinite}
@keyframes pulsedot{0%{box-shadow:0 0 0 0 rgba(255,68,68,.6)}70%{box-shadow:0 0 0 8px rgba(255,68,68,0)}100%{box-shadow:0 0 0 0 rgba(255,68,68,0)}}
.up{color:var(--ok);font-weight:800}
.down{color:var(--err);font-weight:800}
.neu{color:var(--tx3);font-weight:800}
.toggle{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--bd)}
.sw-t{width:42px;height:24px;border-radius:999px;background:#27272a;position:relative;cursor:pointer;border:0}
.sw-t.on{background:var(--ac)}
.sw-t::after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;left:3px;transition:.2s}
.sw-t.on::after{left:21px}
.row-in{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.row-in input,.row-in select{background:var(--track);border:1px solid var(--bd);border-radius:8px;padding:9px 12px;color:var(--tx);font-size:13px;font-family:var(--mono)}
.mnav{display:none}
@media(max-width:860px){
  .side{display:none}.main{padding:24px 18px 80px}.pulse{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}
  .topbar{top:10px;right:12px}
  .mnav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--bd);z-index:50}
  .mnav a{flex:1;text-align:center;padding:12px 0;color:var(--tx3);font-size:12px}
  .mnav a.on{color:var(--ac)}
}`;

function shell(active: string, title: string, sub: string, body: string): string {
  const side = NAVS.map(([h, t]) => `<a href="${h}" class="${active === h ? "on" : ""}"${active === h ? ` style="--na:${NAV_C[h] ?? "var(--ac)"}"` : ""}>${t}</a>`).join("");
  const mob = MOBILE.map(([h, t]) => `<a href="${h}" class="${active === h ? "on" : ""}">${t}</a>`).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>${esc(title)} · Console</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22 fill=%22%238b5cf6%22>◆</text></svg>"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script>(function(){try{if(localStorage.getItem('admin-theme')==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})();</script>
<style>${ADMIN_CSS}</style></head><body>
<div class="topbar">
  <button class="theme-tg" onclick="tgTheme()" aria-label="Toggle light/dark theme" title="Toggle theme">
    <svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
    <svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  </button>
  <a class="lg" href="/admin/logout">Logout</a>
</div>
<div class="layout">
  <nav class="side"><div class="logo"><b>◆</b> AgentMemo</div>${side}<div class="sp"></div><div class="ft"><a href="https://agentmemo.dev" target="_blank">agentmemo.dev ↗</a></div></nav>
  <main class="main"><h1>${esc(title)}</h1><div class="sub">${sub}</div>${body}</main>
</div>
<div class="mnav">${mob}</div>
<script>function tgTheme(){var d=document.documentElement;if(d.getAttribute('data-theme')==='light'){d.removeAttribute('data-theme');try{localStorage.setItem('admin-theme','dark')}catch(e){}}else{d.setAttribute('data-theme','light');try{localStorage.setItem('admin-theme','light')}catch(e){}}}</script>
</body></html>`;
}

// ---- auth ---------------------------------------------------------------
function getCookie(c: { req: { header: (k: string) => string | undefined } }, name: string): string | null {
  const h = c.req.header("cookie") ?? "";
  const m = h.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
async function isAuthed(c: { req: { header: (k: string) => string | undefined }; env: Env }): Promise<boolean> {
  const t = getCookie(c, "admin_session");
  if (!t) return false;
  return (await c.env.CACHE.get(`admin_session_${t}`)) === "valid";
}

async function createSession(c: { env: Env; header: (k: string, v: string) => void }): Promise<void> {
  const token = crypto.randomUUID();
  // isAuthed() accepts the literal "valid" — keep these two in sync.
  await c.env.CACHE.put(`admin_session_${token}`, "valid", { expirationTtl: 86400 });
  c.header("Set-Cookie", `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);
}

// Password login page. Auth is a single shared password compared (constant-time)
// against the ADMIN_DASHBOARD_SECRET Worker secret — no TOTP, nothing persisted
// client-side beyond the session cookie.
function loginPage(): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>·</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050505;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:24px}
.card{background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:48px;max-width:380px;width:100%;text-align:center;box-shadow:0 0 60px rgba(139,92,246,.15)}
.card.shake{animation:shake .4s}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
.dia{font-size:48px;color:#8b5cf6;display:block;margin-bottom:10px}
.s{color:#737373;font-size:13px;margin-bottom:28px}
input.pw{font-size:1.05rem;text-align:center;background:#0a0a0a;border:1px solid #1f1f1f;border-radius:10px;padding:14px 12px;color:#f5f5f5;outline:none;width:100%;caret-color:#8b5cf6}
input.pw.err{border-color:#ef4444}
input.pw:focus{border-color:#2a2a2a}
.btn{margin-top:18px;background:#8b5cf6;color:#fff;border:0;border-radius:10px;padding:12px 0;width:100%;font-size:15px;font-weight:600;cursor:pointer}
.btn:hover{background:#7c3aed}
.hint{color:#ef4444;font-size:12px;margin-top:14px;display:none}
</style></head><body>
<div class="card" id="card">
  <span class="dia">◆ AgentMemo</span>
  <div class="s">Intelligence Console</div>
  <form id="f"><input class="pw" id="pw" type="password" placeholder="Password" autocomplete="current-password" autofocus/><button class="btn" type="submit">Sign in →</button></form>
  <div class="hint" id="hint">Wrong password</div>
</div>
<script>
var f=document.getElementById('f'),pw=document.getElementById('pw'),card=document.getElementById('card'),hint=document.getElementById('hint');
async function submit(){
  if(!pw.value)return;
  try{var r=await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})});
    if(r.ok){card.style.opacity='.4';location.href='/';}
    else{fail();}
  }catch(_){fail();}
}
function fail(){pw.classList.add('err');card.classList.add('shake');hint.style.display='block';pw.value='';pw.focus();setTimeout(function(){pw.classList.remove('err');card.classList.remove('shake')},500);}
f.addEventListener('submit',function(e){e.preventDefault();submit()});
</script></body></html>`;
}

// GET /admin/login — password entry.
admin.get("/admin/login", async (c) => {
  if (await isAuthed(c)) return c.redirect("/", 302);
  return c.html(loginPage());
});

// POST /admin/login — compare password against ADMIN_DASHBOARD_SECRET, create session.
admin.post("/admin/login", async (c) => {
  const ip = c.req.header("cf-connecting-ip") || "unknown";
  if ((await bumpRateWindow(c.env, `adminlogin:${ip}`, 3600, Date.now())) > 5) return c.json({ error: "too many attempts" }, 429);
  const expected = c.env.ADMIN_DASHBOARD_SECRET;
  if (!expected) return c.json({ error: "not configured" }, 503);
  const body = (await c.req.json().catch(() => ({}))) as { password?: string };
  if (!body.password || !timingSafeEqual(body.password, expected)) return c.json({ error: "invalid password" }, 401);
  await createSession(c);
  return c.json({ ok: true });
});

// GET /admin/logout.
admin.get("/admin/logout", async (c) => {
  const t = getCookie(c, "admin_session");
  if (t) await c.env.CACHE.delete(`admin_session_${t}`).catch(() => {});
  c.header("Set-Cookie", "admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  return c.redirect("/admin/login", 302);
});

// Guard: everything below requires a session, else redirect to login.
admin.use("*", async (c, next) => {
  if (await isAuthed(c)) return next();
  return c.redirect("/admin/login", 302);
});

// ---- BRIEF --------------------------------------------------------------
admin.get("/", async (c) => {
  const env = c.env;
  const now = Date.now();
  const sod = startOfDay(now);
  const dayAgo = now - DAY;

  const [mem24, agents24, signupsToday, proCount, totalMem, series] = await Promise.all([
    scalar(env, `SELECT COUNT(*) FROM memories WHERE created_at >= ?`, dayAgo),
    scalar(env, `SELECT COUNT(DISTINCT agent_id) FROM memories WHERE created_at >= ?`, dayAgo),
    scalar(env, `SELECT COUNT(*) FROM api_keys WHERE revoked = 0 AND created_at >= ?`, sod),
    scalar(env, `SELECT COUNT(*) FROM api_keys WHERE tier='pro' AND revoked=0`),
    scalar(env, `SELECT COUNT(*) FROM memories`),
    dailySeries(env, now),
  ]);
  const proToday = await scalar(env, `SELECT COUNT(*) FROM api_keys WHERE tier='pro' AND revoked=0 AND created_at >= ?`, sod);
  const revToday = proToday * 19;

  // Headline — real numbers, AI-narrated (cached 1h), deterministic fallback.
  const dateKey = new Date(now).toISOString().slice(0, 10);
  let headline = await env.CACHE.get(`admin_brief_${dateKey}`);
  if (!headline) {
    if (totalMem === 0) {
      headline = "AgentMemo is live. 0 memories stored, 0 agents active, 0 signups so far. The story begins now.";
    } else {
      const facts = `memories_last_24h=${mem24}; active_agents=${agents24}; signups_today=${signupsToday}; pro_subscribers=${proCount}; total_memories=${totalMem}; revenue_today=$${revToday}`;
      headline = await summarize(
        env,
        "You are an analyst writing a one-paragraph morning brief for the founder of AgentMemo. Write 2-3 plain sentences summarizing these real stats. No preamble, no markdown.",
        facts,
      );
      if (!headline || headline.length < 20) {
        headline = `In the last 24h, ${fmt(agents24)} agent${agents24 === 1 ? "" : "s"} stored ${fmt(mem24)} memories. ${fmt(signupsToday)} new signup${signupsToday === 1 ? "" : "s"} today. ${fmt(proCount)} Pro subscriber${proCount === 1 ? "" : "s"} — $${fmt(proCount * 19)} MRR.`;
      }
    }
    await env.CACHE.put(`admin_brief_${dateKey}`, headline, { expirationTtl: 3600 }).catch(() => {});
  }

  const pulse = `<div class="pulse">
    <div class="pcell"><div class="n">${fmt(mem24)}</div><div class="l">memories · 24h</div>${spark(series)}</div>
    <div class="pcell"><div class="n">${fmt(agents24)}</div><div class="l">agents active</div>${spark(series)}</div>
    <div class="pcell"><div class="n">${fmt(signupsToday)}</div><div class="l">signups today</div></div>
    <div class="pcell"><div class="n">$${fmt(revToday)}</div><div class="l">revenue today</div></div>
  </div>`;

  // Story cards — only rendered when backed by real data.
  const cards: string[] = [];
  if (totalMem > 0) {
    const avgImp = await scalar(env, `SELECT COALESCE(AVG(importance),0) FROM memories`);
    const withOutcome = await scalar(env, `SELECT COUNT(*) FROM memories WHERE outcome != 'unknown'`);
    const pctOutcome = totalMem ? Math.round((withOutcome / totalMem) * 100) : 0;
    cards.push(`<div class="card"><h3>🧠 Memory Quality</h3><p>Across ${fmt(totalMem)} memories, average importance is ${avgImp.toFixed(1)}/10 and ${pctOutcome}% carry an outcome signal. Outcome tracking is the biggest lever on retrieval quality.</p><a class="btn" href="/memories">View memories →</a></div>`);
  }
  const lowTrust = await rowsOf<{ api_key_id: string; trust_score: number; flagged_writes: number }>(
    env, `SELECT api_key_id, trust_score, flagged_writes FROM agent_trust WHERE trust_score < 0.5 OR blocked = 1 ORDER BY trust_score ASC LIMIT 1`,
  );
  if (lowTrust.length) {
    const a = lowTrust[0];
    cards.push(`<div class="card" style="border-left-color:#ff4444"><h3>🚨 Security Alert</h3><p>Key <span style="font-family:var(--mono)">${esc(a.api_key_id)}</span> has trust ${Number(a.trust_score).toFixed(2)} with ${fmt(Number(a.flagged_writes))} flagged write(s). Auto-flagged by the trust engine.</p><a class="btn" href="/security">Review →</a></div>`);
  } else if (totalMem > 0) {
    cards.push(`<div class="card" style="border-left-color:#00ff88"><h3>🛡️ Security</h3><p>All agents are healthy — no keys below 0.5 trust, none blocked.</p><a class="btn ghost" href="/security">Open security →</a></div>`);
  }
  const opp = await scalar(env, `SELECT COUNT(*) FROM api_keys WHERE tier!='pro' AND revoked=0 AND monthly_usage > 8000`);
  if (opp > 0) {
    cards.push(`<div class="card" style="border-left-color:#ffaa00"><h3>💡 Opportunity</h3><p>${fmt(opp)} free-tier key(s) are over 8,000 operations this month — close to the 10k line. A good moment for an upgrade nudge.</p><a class="btn" href="/agents">See agents →</a></div>`);
  }

  const story = cards.length
    ? `<div class="story">${cards.join("")}</div>`
    : `<div class="empty"><b>The story begins now.</b>When agents start storing memories, insights will appear here.</div>`;

  return c.html(shell("/", "Morning Brief", new Date(now).toUTCString(), `<div class="headline">${esc(headline)}</div>${pulse}${story}`));
});

// ---- AGENTS -------------------------------------------------------------
admin.get("/agents", async (c) => {
  const env = c.env;
  const agents = await rowsOf<{ api_key_id: string; agent_id: string; memories: number; users: number; last: number; owner: string | null; tier: string }>(
    env,
    `SELECT m.api_key_id, m.agent_id, COUNT(*) AS memories, COUNT(DISTINCT m.user_id) AS users,
            MAX(m.created_at) AS last, ak.owner, ak.tier
     FROM memories m JOIN api_keys ak ON ak.id = m.api_key_id
     GROUP BY m.api_key_id, m.agent_id ORDER BY memories DESC LIMIT 60`,
  );
  let body: string;
  if (!agents.length) {
    body = `<div class="empty"><b>No agents yet.</b>Share agentmemo.dev to get started — registered agents and their activity will appear here.</div>`;
  } else {
    const trust = new Map(
      (await rowsOf<{ api_key_id: string; trust_score: number }>(env, `SELECT api_key_id, trust_score FROM agent_trust`))
        .map((r) => [r.api_key_id, Number(r.trust_score)]),
    );
    body = agents.map((a) => {
      const ts = trust.get(a.api_key_id) ?? 1;
      const bars = Math.round(ts * 10);
      return `<div class="agent"><div class="top"><span class="id">${esc(a.agent_id)}</span><span class="badge ${a.tier === "pro" ? "pro" : "free"}">${a.tier === "pro" ? "Pro" : "Free"}</span></div>
        <div style="color:var(--tx3);font-size:13px;margin:6px 0">${esc(a.owner ?? "no email")}</div>
        <div style="font-size:13px;margin:8px 0">${fmt(Number(a.memories))} memories · ${fmt(Number(a.users))} users · last active ${ago(Number(a.last))}</div>
        <div style="font-size:12px;color:var(--tx3)">Trust ${"█".repeat(bars)}${"░".repeat(10 - bars)} ${ts.toFixed(2)}</div></div>`;
    }).join("");
  }
  return c.html(shell("/agents", "Agents", "Everyone building on AgentMemo", body));
});

// ---- MEMORIES -----------------------------------------------------------
admin.get("/memories", async (c) => {
  const env = c.env;
  const search = c.req.query("q")?.trim();
  const cats = await rowsOf<{ category: string; n: number }>(
    env, `SELECT COALESCE(category,'other') AS category, COUNT(*) AS n FROM memories GROUP BY category ORDER BY n DESC`,
  );
  const total = cats.reduce((s, r) => s + Number(r.n), 0);

  let donut = `<div class="empty" style="padding:24px">No memories yet — no categories to chart.</div>`;
  if (total > 0) {
    let acc = 0;
    const stops = cats.map((r) => {
      const start = (acc / total) * 360;
      acc += Number(r.n);
      const end = (acc / total) * 360;
      return `${catColor(r.category)} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
    }).join(",");
    const legend = cats.map((r) => `<span><span class="sw" style="background:${catColor(r.category)}"></span>${esc(r.category)} ${Math.round((Number(r.n) / total) * 100)}%</span>`).join("");
    donut = `<div style="display:flex;gap:30px;align-items:center;flex-wrap:wrap"><div style="position:relative"><div class="donut" style="background:conic-gradient(${stops})"></div><div class="donut-c"></div></div><div class="legend">${legend}</div></div>`;
  }

  const where = search ? `WHERE m.content LIKE ?` : "";
  const binds = search ? [`%${search}%`] : [];
  const stream = await rowsOf<{ agent_id: string; user_id: string; content: string; category: string; importance: number; trust_score: number; outcome: string; outcome_score: number; created_at: number }>(
    env,
    `SELECT m.agent_id, m.user_id, m.content, m.category, m.importance, m.trust_score, m.outcome, m.outcome_score, m.created_at
     FROM memories m ${where} ORDER BY m.created_at DESC LIMIT 50`,
    ...binds,
  );
  let streamHtml: string;
  if (!stream.length) {
    streamHtml = search
      ? `<div class="empty"><b>No matches.</b>No memories contain “${esc(search)}”.</div>`
      : `<div class="empty"><b>No memories stored yet.</b>When agents start storing memories, they'll appear here in real time.</div>`;
  } else {
    streamHtml = stream.map((m) => `<div class="mem"><div class="hdr">${esc(m.agent_id)} · ${esc(m.user_id)} · ${ago(Number(m.created_at))}</div>
      <div class="tags"><span style="color:${catColor(m.category ?? "other")};border-color:${catColor(m.category ?? "other")}">${esc(m.category ?? "other")}</span><span>importance ${Number(m.importance)}</span></div>
      <div class="body">${esc(m.content)}</div>
      <div class="ftr">trust ${Number(m.trust_score).toFixed(2)} · outcome ${m.outcome === "success" ? "✅" : m.outcome === "failure" ? "❌" : "—"} · score ${Number(m.outcome_score).toFixed(2)}</div></div>`).join("");
  }

  const searchBar = `<form class="row-in"><input name="q" placeholder="search memory content…" value="${esc(search ?? "")}" style="flex:1"/><button class="btn">Search</button></form>`;
  return c.html(shell("/memories", "Memories", "What the agentic web is thinking about", `<div class="card">${donut}</div>${searchBar}${streamHtml}`));
});

// ---- REVENUE ------------------------------------------------------------
admin.get("/revenue", async (c) => {
  const env = c.env;
  const pro = await scalar(env, `SELECT COUNT(*) FROM api_keys WHERE tier='pro' AND revoked=0`);
  const free = await scalar(env, `SELECT COUNT(*) FROM api_keys WHERE tier!='pro' AND revoked=0`);
  const total = pro + free;
  const mrr = pro * 19;
  const conv = total ? ((pro / total) * 100).toFixed(1) : "0.0";
  const milestone = 190;
  const pct = Math.min(100, Math.round((mrr / milestone) * 100));
  const bar = `<div class="bartrk" style="height:14px"><div class="barfl" style="width:${pct}%;background:var(--ac)"></div></div>`;
  const body = `<div class="big">$${fmt(mrr)}</div><div class="sub" style="text-align:center">Monthly Recurring Revenue</div>
    <div class="card" style="text-align:center"><div style="font-size:15px;color:var(--tx)">${fmt(pro)} Pro subscriber${pro === 1 ? "" : "s"} · ${fmt(free)} Free user${free === 1 ? "" : "s"} · ${conv}% conversion</div></div>
    <div class="card"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>Next milestone: $${fmt(milestone)} MRR</span><span>${pct}%</span></div>${bar}
    <div style="color:var(--tx3);font-size:13px;margin-top:12px">${mrr === 0 ? "No revenue yet. Your first Pro upgrade starts the curve." : `${10 - pro} more Pro subscribers to reach $${milestone} MRR.`}</div></div>`;
  return c.html(shell("/revenue", "Revenue", "The simple truth", body));
});

// ---- SECURITY -----------------------------------------------------------
admin.get("/security", async (c) => {
  const env = c.env;
  const dist = await rowsOf<{ healthy: number; at_risk: number; blocked: number }>(
    env,
    `SELECT SUM(CASE WHEN trust_score>0.7 THEN 1 ELSE 0 END) AS healthy,
            SUM(CASE WHEN trust_score BETWEEN 0.3 AND 0.7 THEN 1 ELSE 0 END) AS at_risk,
            SUM(CASE WHEN trust_score<0.3 THEN 1 ELSE 0 END) AS blocked FROM agent_trust`,
  );
  const d = dist[0] ?? { healthy: 0, at_risk: 0, blocked: 0 };
  const tot = Number(d.healthy) + Number(d.at_risk) + Number(d.blocked);
  const blocked = Number(d.blocked);
  const status = blocked > 0
    ? `<span class="dot crit" style="background:var(--err)"></span> ${blocked} key(s) blocked`
    : Number(d.at_risk) > 0
      ? `<span class="dot" style="background:var(--warn)"></span> ${d.at_risk} key(s) at risk`
      : `<span class="dot" style="background:var(--ok)"></span> All systems secure`;
  const pctf = (n: number) => (tot ? Math.round((n / tot) * 100) : 0);
  const distHtml = tot === 0
    ? `<div class="empty" style="padding:24px">No trust data yet — no writes recorded.</div>`
    : `<div style="font-size:13px">
       <div>Healthy &gt;0.7 — ${pctf(Number(d.healthy))}%</div><div class="bartrk"><div class="barfl" style="width:${pctf(Number(d.healthy))}%;background:var(--ok)"></div></div>
       <div>At risk 0.3–0.7 — ${pctf(Number(d.at_risk))}%</div><div class="bartrk"><div class="barfl" style="width:${pctf(Number(d.at_risk))}%;background:var(--warn)"></div></div>
       <div>Blocked &lt;0.3 — ${pctf(blocked)}%</div><div class="bartrk"><div class="barfl" style="width:${pctf(blocked)}%;background:var(--err)"></div></div></div>`;
  const events = await rowsOf<{ action: string; api_key_id: string; trust_score: number; timestamp: number }>(
    env, `SELECT action, api_key_id, trust_score, timestamp FROM memory_audit ORDER BY timestamp DESC LIMIT 40`,
  );
  const evHtml = events.length
    ? events.map((e) => `<div class="mem" style="padding:10px 0"><span class="ftr">${esc(e.action)} · ${esc(e.api_key_id)} · trust ${e.trust_score == null ? "—" : Number(e.trust_score).toFixed(2)} · ${ago(Number(e.timestamp))}</span></div>`).join("")
    : `<div class="empty" style="padding:24px">No audit events yet.</div>`;
  const incident = `<div class="card" style="border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.05)">
    <h3 style="color:var(--warn);font-size:15px;margin-bottom:8px">⚠ Incident — resolved</h3>
    <p style="font-size:14px;line-height:1.6;color:var(--tx2)"><b style="color:var(--tx)">Forged Pro upgrades via unverified webhook.</b> While <code>DODO_WEBHOOK_SECRET</code> was unset, <code>/webhooks/dodo</code> accepted unverified events, letting an external actor upgrade 5 keys to Pro (owner <code>recon@test.invalid</code>, e.g. <code>victim-PENTEST-MARK</code>).</p>
    <p style="font-size:13px;color:var(--tx3);margin-top:8px">Fixed Jun 19, 2026: webhook now rejects with 401 unless the signature verifies; affected keys revoked &amp; downgraded; request IP hashing added to the audit log.</p>
  </div>`;
  const injectionIncident = `<div class="card" style="border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.05)">
    <h3 style="color:var(--warn);font-size:15px;margin-bottom:8px">⚠ Incident — resolved</h3>
    <p style="font-size:14px;line-height:1.6;color:var(--tx2)"><b style="color:var(--tx)">Prompt-injection pentest payloads in stored memories.</b> A pentest seeded 9 memories under <code>victim_*</code> accounts carrying injection markers (<code>PENTEST-MARKER</code>, <code>SYSTEM OVERRIDE</code>, exfiltration strings). The 5 keys involved (owner <code>recon@test.invalid</code>) were already revoked.</p>
    <p style="font-size:13px;color:var(--tx3);margin-top:8px">Fixed Jun 19, 2026: removed all 9 victim memories; added content-policy filtering and a per-user write cap (100/hr) on <code>POST /memory/store</code> to block bulk injection. Revoked attack keys retained as evidence.</p>
  </div>`;
  const body = `${injectionIncident}${incident}<div class="card"><div class="statusline">${status}</div></div><div class="card"><h3 style="color:var(--tx);font-size:15px;margin-bottom:14px">Trust distribution</h3>${distHtml}</div><div class="card"><h3 style="color:var(--tx);font-size:15px;margin-bottom:6px">Recent events</h3>${evHtml}</div>`;
  return c.html(shell("/security", "Security", "Peace of mind", body));
});

// ---- PATTERNS -----------------------------------------------------------
admin.get("/patterns", async (c) => {
  const env = c.env;
  const total = await scalar(env, `SELECT COUNT(*) FROM memories`);
  if (total === 0) {
    return c.html(shell("/patterns", "Patterns", "What the data is telling you", `<div class="empty"><b>Not enough data yet.</b>Once agents store memories, daily AI analysis will surface emerging topics, workflows, and gaps here.</div>`));
  }
  const [withOutcome, withNs, agents, cats] = await Promise.all([
    scalar(env, `SELECT COUNT(*) FROM memories WHERE outcome != 'unknown'`),
    scalar(env, `SELECT COUNT(*) FROM memories WHERE namespace != 'default'`),
    scalar(env, `SELECT COUNT(DISTINCT agent_id) FROM memories`),
    rowsOf<{ category: string; n: number }>(env, `SELECT COALESCE(category,'other') AS category, COUNT(*) AS n FROM memories GROUP BY category ORDER BY n DESC LIMIT 1`),
  ]);
  const pO = Math.round((withOutcome / total) * 100);
  const pN = Math.round((withNs / total) * 100);
  const topCat = cats[0]?.category ?? "—";
  const perAgent = agents ? (total / agents).toFixed(1) : "0";
  const cards = [
    ["📈 Memory mix", `The most common memory category is <b style="color:var(--tx)">${esc(topCat)}</b>. Agents store an average of <b style="color:var(--tx)">${perAgent}</b> memories each.`],
    ["🧩 Memory gaps", `Only <b style="color:var(--tx)">${pO}%</b> of memories carry an outcome signal. Promoting <span style="font-family:var(--mono)">/memory/feedback</span> would make retrieval smarter over time.`],
    ["🗂️ Namespaces", `<b style="color:var(--tx)">${pN}%</b> of memories use a namespace. Namespaced stores tend to retrieve more accurately — worth nudging.`],
  ];
  const body = cards.map(([h, p]) => `<div class="card"><h3 style="color:var(--tx);font-size:15px;margin-bottom:10px">${h}</h3><p style="font-size:14px;line-height:1.6">${p}</p></div>`).join("");
  return c.html(shell("/patterns", "Patterns", "What the data is telling you — refreshed daily", `${body}<div class="sub" style="margin-top:8px">All figures computed live from anonymized memory aggregates.</div>`));
});

// ---- LOGS ---------------------------------------------------------------
admin.get("/logs", async (c) => {
  const env = c.env;
  const q = c.req.query("q")?.trim();
  const where = q ? `WHERE action LIKE ? OR api_key_id LIKE ?` : "";
  const binds = q ? [`%${q}%`, `%${q}%`] : [];
  const logs = await rowsOf<{ action: string; api_key_id: string; memory_id: string; outcome: string; timestamp: number }>(
    env, `SELECT action, api_key_id, memory_id, outcome, timestamp FROM memory_audit ${where} ORDER BY timestamp DESC LIMIT 100`, ...binds,
  );
  const search = `<form class="row-in"><input name="q" placeholder="search action or key…" value="${esc(q ?? "")}" style="flex:1"/><button class="btn">Search</button><a class="btn ghost" href="/logs.csv">Export CSV</a></form>`;
  const table = logs.length
    ? `<table class="tbl"><tr><th>Time</th><th>Action</th><th>Key</th><th>Memory</th><th>Outcome</th></tr>${logs.map((l) => `<tr><td>${new Date(Number(l.timestamp)).toISOString().slice(0, 19).replace("T", " ")}</td><td>${esc(l.action)}</td><td>${esc(l.api_key_id)}</td><td>${esc(l.memory_id ?? "—")}</td><td>${esc(l.outcome ?? "—")}</td></tr>`).join("")}</table>`
    : `<div class="empty"><b>No log entries yet.</b>Every memory operation is recorded here.</div>`;
  return c.html(shell("/logs", "Logs", "Full audit trail", search + table));
});

admin.get("/logs.csv", async (c) => {
  const logs = await rowsOf<{ action: string; api_key_id: string; memory_id: string; outcome: string; timestamp: number }>(
    c.env, `SELECT timestamp, action, api_key_id, memory_id, outcome FROM memory_audit ORDER BY timestamp DESC LIMIT 5000`,
  );
  const csv = "timestamp,action,api_key_id,memory_id,outcome\n" +
    logs.map((l) => `${l.timestamp},${l.action},${l.api_key_id},${l.memory_id ?? ""},${l.outcome ?? ""}`).join("\n");
  c.header("content-type", "text/csv; charset=utf-8");
  c.header("content-disposition", "attachment; filename=audit-log.csv");
  return c.body(csv);
});

// ---- SETTINGS -----------------------------------------------------------
const SETTINGS = [
  ["signups_open", "New signups open", "1"],
  ["free_tier_enforced", "Free tier limits enforced", "0"],
  ["maintenance", "Maintenance mode", "0"],
] as const;

admin.post("/settings/toggle", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { key?: string; value?: string };
  if (!body.key || !SETTINGS.some((s) => s[0] === body.key)) return c.json({ error: "bad key" }, 400);
  await c.env.CACHE.put(`admin:setting:${body.key}`, body.value === "1" ? "1" : "0");
  return c.json({ ok: true });
});

admin.post("/settings/action", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { action?: string };
  const env = c.env;
  if (body.action === "flush_expired") {
    const r = await env.DB.prepare(`DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at < ?`).bind(Date.now()).run();
    return c.json({ ok: true, deleted: r.meta?.changes ?? 0 });
  }
  if (body.action === "clear_cache") {
    await Promise.all([env.CACHE.delete("status:report"), env.CACHE.delete("observatory:report")].map((p) => p.catch(() => {})));
    return c.json({ ok: true });
  }
  return c.json({ error: "unknown action" }, 400);
});

admin.get("/settings", async (c) => {
  const env = c.env;
  const toggles = await Promise.all(SETTINGS.map(async ([k, label, def]) => {
    const v = (await env.CACHE.get(`admin:setting:${k}`)) ?? def;
    return `<div class="toggle"><span>${label}</span><button class="sw-t ${v === "1" ? "on" : ""}" data-k="${k}" onclick="tog(this)"></button></div>`;
  }));
  const keys = await rowsOf<{ id: string; name: string; owner: string | null; tier: string; revoked: number; created_at: number }>(
    env, `SELECT id, name, owner, tier, revoked, created_at FROM api_keys ORDER BY created_at DESC LIMIT 50`,
  );
  const keyTable = keys.length
    ? `<table class="tbl"><tr><th>Key ID</th><th>Name</th><th>Owner</th><th>Tier</th><th>Status</th></tr>${keys.map((k) => `<tr><td>${esc(k.id)}</td><td>${esc(k.name)}</td><td>${esc(k.owner ?? "—")}</td><td>${esc(k.tier)}</td><td>${k.revoked ? "revoked" : "active"}</td></tr>`).join("")}</table>`
    : `<div class="empty" style="padding:24px">No keys yet.</div>`;
  const body = `<div class="card"><h3 style="color:var(--tx);font-size:15px;margin-bottom:6px">Platform</h3>${toggles.join("")}</div>
    <div class="card"><h3 style="color:var(--tx);font-size:15px;margin-bottom:14px">Keys</h3>${keyTable}</div>
    <div class="card" style="border-color:rgba(239,68,68,.4)"><h3 style="color:var(--err);font-size:15px;margin-bottom:14px">Danger zone</h3>
      <button class="btn danger" onclick="act('flush_expired')">Flush expired memories</button>
      <button class="btn danger" onclick="act('clear_cache')">Clear cache</button>
      <div id="dz" style="color:var(--tx3);font-size:13px;margin-top:12px"></div></div>
    <script>
    function tog(b){var on=!b.classList.contains('on');fetch('/settings/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:b.dataset.k,value:on?'1':'0'})}).then(function(){b.classList.toggle('on')})}
    function act(a){if(!confirm('Run '+a+'?'))return;fetch('/settings/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:a})}).then(function(r){return r.json()}).then(function(j){document.getElementById('dz').textContent=JSON.stringify(j)})}
    </script>`;
  return c.html(shell("/settings", "Settings", "Control panel", body));
});

export default admin;
