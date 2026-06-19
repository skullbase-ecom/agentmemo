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
  user_preference: "#8b5cf6", preferences: "#8b5cf6", operational: "#06b6d4",
  factual: "#22c55e", facts: "#22c55e", procedural: "#f59e0b", emotional: "#ef4444",
  people: "#a78bfa", tasks: "#14b8a6", events: "#eab308", technical: "#3b82f6",
  commerce: "#ec4899", location: "#10b981", health: "#f43f5e", other: "#52525b",
};
const catColor = (c: string) => CAT_COLORS[c] ?? "#52525b";

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

const ADMIN_CSS = `
:root{--bg:#050505;--panel:#0f0f0f;--card:#141414;--bd:#1f1f1f;--bd2:#2a2a2a;--tx:#f5f5f5;--tx2:#a1a1aa;--tx3:#71717a;--ac:#8b5cf6;--ok:#22c55e;--warn:#f59e0b;--err:#ef4444;--mono:'JetBrains Mono',ui-monospace,monospace;--sans:'Inter',system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx2);font-family:var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.layout{display:flex;min-height:100vh}
.side{width:200px;flex-shrink:0;border-right:1px solid var(--bd);padding:24px 0;position:sticky;top:0;height:100vh;display:flex;flex-direction:column}
.side .logo{padding:0 22px 22px;font-weight:700;color:var(--tx);font-size:16px}
.side .logo b{color:var(--ac)}
.side a{display:block;padding:9px 22px;color:var(--tx3);font-size:14px}
.side a:hover{color:var(--tx)}
.side a.on{color:var(--tx);border-left:2px solid var(--ac);padding-left:20px}
.side .sp{flex:1}
.side .ft{padding:14px 22px 0;border-top:1px solid var(--bd);font-size:13px}
.side .ft a{padding:6px 0;color:var(--tx3)}
.main{flex:1;min-width:0;padding:36px 40px 90px}
h1{color:var(--tx);font-size:24px;font-weight:700;letter-spacing:-.02em;margin-bottom:4px}
.sub{color:var(--tx3);font-size:14px;margin-bottom:28px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:22px;margin-bottom:16px}
.headline{background:linear-gradient(180deg,#141414,#0d0d0d);border:1px solid var(--bd);border-radius:14px;padding:26px;font-size:18px;line-height:1.6;color:var(--tx);margin-bottom:26px}
.pulse{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.pcell{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px}
.pcell .n{font-size:32px;font-weight:800;color:var(--tx);letter-spacing:-.02em}
.pcell .l{color:var(--tx3);font-size:12px;margin-top:2px}
.spark{width:100%;height:24px;margin-top:10px;display:block}
.spark-empty{color:var(--tx3);font-size:11px}
.story .card h3{color:var(--tx);font-size:15px;margin-bottom:10px}
.story .card p{font-size:14px;line-height:1.6;margin-bottom:14px}
.btn{display:inline-block;background:var(--ac);color:#fff;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;border:0;cursor:pointer;margin-right:8px}
.btn.ghost{background:transparent;border:1px solid var(--bd2);color:var(--tx2)}
.btn.danger{background:var(--err)}
.empty{text-align:center;color:var(--tx3);padding:48px 20px;border:1px dashed var(--bd2);border-radius:12px}
.empty b{color:var(--tx2);display:block;margin-bottom:6px;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.bartrk{height:8px;background:#0a0a0a;border-radius:5px;overflow:hidden;margin:4px 0}
.barfl{height:100%;border-radius:5px}
.donut{width:160px;height:160px;border-radius:50%;flex-shrink:0}
.donut-c{width:90px;height:90px;border-radius:50%;background:var(--bg);position:absolute;inset:35px}
.legend span{display:flex;align-items:center;gap:8px;font-size:13px;margin:5px 0}
.legend .sw{width:10px;height:10px;border-radius:3px}
.mem{border-bottom:1px solid var(--bd);padding:14px 0}
.mem .hdr{font-size:12px;color:var(--tx3);font-family:var(--mono);margin-bottom:6px}
.mem .tags span{display:inline-block;font-size:11px;background:#1a1a1a;border:1px solid var(--bd);border-radius:5px;padding:1px 7px;margin-right:6px;color:var(--tx2)}
.mem .body{color:var(--tx);font-size:14px;margin:8px 0;line-height:1.5}
.mem .ftr{font-size:12px;color:var(--tx3);font-family:var(--mono)}
.agent{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px;margin-bottom:14px}
.agent .top{display:flex;justify-content:space-between;align-items:center}
.agent .id{color:var(--tx);font-weight:600;font-family:var(--mono)}
.badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}
.badge.pro{background:rgba(139,92,246,.18);color:#a78bfa}
.badge.free{background:#1a1a1a;color:var(--tx3)}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;color:var(--tx3);font-weight:600;font-size:11px;text-transform:uppercase;padding:8px 10px;border-bottom:1px solid var(--bd)}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--bd);font-family:var(--mono);color:var(--tx2)}
.big{font-size:64px;font-weight:800;color:var(--tx);text-align:center;letter-spacing:-.03em}
.statusline{display:flex;align-items:center;gap:12px;font-size:18px;color:var(--tx);font-weight:600}
.dot{width:12px;height:12px;border-radius:50%}
.toggle{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--bd)}
.sw-t{width:42px;height:24px;border-radius:999px;background:#27272a;position:relative;cursor:pointer;border:0}
.sw-t.on{background:var(--ac)}
.sw-t::after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;left:3px;transition:.2s}
.sw-t.on::after{left:21px}
.row-in{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.row-in input,.row-in select{background:#0a0a0a;border:1px solid var(--bd);border-radius:8px;padding:9px 12px;color:var(--tx);font-size:13px;font-family:var(--mono)}
.mnav{display:none}
@media(max-width:860px){
  .side{display:none}.main{padding:24px 18px 80px}.pulse{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}
  .mnav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--bd);z-index:50}
  .mnav a{flex:1;text-align:center;padding:12px 0;color:var(--tx3);font-size:12px}
  .mnav a.on{color:var(--ac)}
}`;

function shell(active: string, title: string, sub: string, body: string): string {
  const side = NAVS.map(([h, t]) => `<a href="${h}" class="${active === h ? "on" : ""}">${t}</a>`).join("");
  const mob = MOBILE.map(([h, t]) => `<a href="${h}" class="${active === h ? "on" : ""}">${t}</a>`).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>${esc(title)} · Console</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22 fill=%22%238b5cf6%22>◆</text></svg>"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${ADMIN_CSS}</style></head><body>
<div class="layout">
  <nav class="side"><div class="logo"><b>◆</b> AgentMemo</div>${side}<div class="sp"></div><div class="ft"><a href="https://agentmemo.dev" target="_blank">agentmemo.dev ↗</a><a href="/admin/logout">Logout</a></div></nav>
  <main class="main"><h1>${esc(title)}</h1><div class="sub">${sub}</div>${body}</main>
</div>
<div class="mnav">${mob}</div>
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

// ---- TOTP (pure Web Crypto, Google Authenticator compatible) ------------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf: Uint8Array): string {
  let bits = 0, val = 0, out = "";
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
function base32Decode(s: string): Uint8Array {
  s = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, val = 0;
  const out: number[] = [];
  for (const ch of s) { const i = B32.indexOf(ch); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return new Uint8Array(out);
}
async function hotp(secretBytes: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const dv = new DataView(buf);
  dv.setUint32(0, Math.floor(counter / 4294967296));
  dv.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const off = sig[19] & 0xf;
  const bin = ((sig[off] & 0x7f) << 24) | (sig[off + 1] << 16) | (sig[off + 2] << 8) | sig[off + 3];
  return String(bin % 1000000).padStart(6, "0");
}
async function totpVerify(secretB32: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const sb = base32Decode(secretB32);
  const ctr = Math.floor(Date.now() / 30000);
  for (const w of [-1, 0, 1]) if ((await hotp(sb, ctr + w)) === code) return true;
  return false;
}

async function createSession(c: { env: Env; header: (k: string, v: string) => void }): Promise<void> {
  const token = crypto.randomUUID();
  await c.env.CACHE.put(`admin_session_${token}`, String(Date.now()), { expirationTtl: 86400 });
  c.header("Set-Cookie", `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);
}

// Setup is gated by the bootstrap secret (ADMIN_DASHBOARD_SECRET) so an attacker
// who finds the URL before setup can't claim the console. After setup completes,
// logins are pure TOTP.
function setupAuthorized(c: { env: Env; req: { query: (k: string) => string | undefined } }, key?: string): boolean {
  const secret = c.env.ADMIN_DASHBOARD_SECRET;
  if (!secret) return true; // no bootstrap secret configured -> open setup
  const provided = key ?? c.req.query("key") ?? "";
  return provided.length > 0 && timingSafeEqual(provided, secret);
}

function codePage(opts: { title: string; sub: string; action: string; extra?: string; key?: string }): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>·</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050505;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Inter',system-ui,sans-serif;padding:24px}
.card{background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:48px;max-width:380px;width:100%;text-align:center;box-shadow:0 0 60px rgba(139,92,246,.15)}
.card.shake{animation:shake .4s}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
.dia{font-size:48px;color:#8b5cf6;display:block;margin-bottom:10px}
.ttl{color:#f5f5f5;font-weight:700;font-size:18px}
.s{color:#737373;font-size:13px;margin-bottom:28px}
input.code{font-size:2rem;letter-spacing:.5em;text-align:center;max-width:200px;background:#0a0a0a;border:1px solid #1f1f1f;border-radius:10px;padding:12px 8px;color:#f5f5f5;outline:none;width:100%;caret-color:#8b5cf6}
input.code.err{border-color:#ef4444}
input.code:focus{border-color:#2a2a2a}
.btn{margin-top:18px;background:#8b5cf6;color:#fff;border:0;border-radius:10px;padding:12px 0;width:100%;font-size:15px;font-weight:600;cursor:pointer}
.btn:hover{background:#7c3aed}
.hint{color:#52525b;font-size:12px;margin-top:14px}
${opts.extra ? "" : ""}
</style></head><body>
<div class="card" id="card">
  <span class="dia">◆ AgentMemo</span>
  <div class="s">${opts.sub}</div>
  ${opts.extra ?? ""}
  <form id="f"><input class="code" id="code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="000000" autocomplete="one-time-code" autofocus/><button class="btn" type="submit">Verify →</button></form>
  <div class="hint">Code refreshes every 30s</div>
</div>
<script>
var f=document.getElementById('f'),code=document.getElementById('code'),card=document.getElementById('card');
async function submit(){
  if(!/^\\d{6}$/.test(code.value))return;
  try{var r=await fetch('${opts.action}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code.value${opts.key ? `,key:${JSON.stringify(opts.key)}` : ""}})});
    if(r.ok){card.style.opacity='.4';location.href='/';}
    else{fail();}
  }catch(_){fail();}
}
function fail(){code.classList.add('err');card.classList.add('shake');code.value='';setTimeout(function(){code.classList.remove('err');card.classList.remove('shake')},500);}
f.addEventListener('submit',function(e){e.preventDefault();submit()});
code.addEventListener('input',function(){if(code.value.length===6)submit()});
</script></body></html>`;
}

// Manual-entry enrollment page. No QR image / external QR API — those proved
// unreliable. We show the secret in clear text with copy buttons and step-by-step
// instructions for "enter setup key manually" in Google Authenticator.
function setupPage(secret: string, key?: string): string {
  // Thread the bootstrap secret into the POST body so /admin/setup authorizes
  // when ADMIN_DASHBOARD_SECRET is configured (mirrors codePage).
  const keyField = key ? `, key: ${JSON.stringify(key)}` : "";
  const secretJs = JSON.stringify(secret);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>·</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050505;min-height:100vh;font-family:system-ui,sans-serif}</style></head><body>
<div style="text-align:center;max-width:480px;margin:0 auto;padding:48px 24px">
  <div style="font-size:48px;color:#8b5cf6;margin-bottom:24px">◆</div>
  <h1 style="color:#f5f5f5;font-size:1.5rem;font-weight:700;margin-bottom:8px">Set up 2FA</h1>
  <p style="color:#737373;margin-bottom:32px">Add AgentMemo Admin to Google Authenticator</p>
  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:left">
    <p style="color:#737373;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Step 1</p>
    <p style="color:#f5f5f5;margin-bottom:16px">Open Google Authenticator on your phone</p>
    <p style="color:#737373;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Step 2</p>
    <p style="color:#f5f5f5;margin-bottom:16px">Tap + → Enter setup key manually</p>
    <p style="color:#737373;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Step 3 — Account name</p>
    <div style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <code style="color:#8b5cf6;font-size:1rem;font-family:monospace">AgentMemo Admin</code>
      <button onclick="copy('AgentMemo Admin',this)" style="background:none;border:1px solid #2a2a2a;color:#737373;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:0.8rem">Copy</button>
    </div>
    <p style="color:#737373;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Step 4 — Your secret key</p>
    <div style="background:#0a0a0a;border:1px solid #8b5cf6;border-radius:8px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <code id="secret-display" style="color:#8b5cf6;font-size:1.1rem;font-family:monospace;letter-spacing:0.15em;font-weight:700">${secret}</code>
      <button onclick="copy(${secretJs},this)" style="background:none;border:1px solid #8b5cf6;color:#8b5cf6;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:0.8rem">Copy</button>
    </div>
    <p style="color:#737373;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Step 5 — Key type</p>
    <p style="color:#f5f5f5;margin-bottom:0">Select <strong style="color:#8b5cf6">Time based</strong> then tap Add</p>
  </div>
  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px">
    <p style="color:#f5f5f5;font-weight:600;margin-bottom:16px">Step 6 — Verify setup</p>
    <p style="color:#737373;font-size:0.9rem;margin-bottom:16px">Enter the 6-digit code from Google Authenticator to confirm:</p>
    <input type="text" inputmode="numeric" pattern="[0-9]*" id="verify-code" placeholder="000000" maxlength="6" autocomplete="one-time-code" style="width:100%;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:14px;color:#f5f5f5;font-size:1.5rem;text-align:center;letter-spacing:0.5em;font-family:monospace;box-sizing:border-box;margin-bottom:12px" oninput="if(this.value.length>=6)verify()"/>
    <button onclick="verify()" style="width:100%;background:#8b5cf6;color:#fff;border:none;border-radius:8px;padding:14px;font-size:1rem;font-weight:600;cursor:pointer">Confirm &amp; Access Console →</button>
    <p id="verify-err" style="color:#ef4444;font-size:0.85rem;text-align:center;margin-top:12px;display:none">Wrong code — try again</p>
  </div>
</div>
<script>
function copy(text, btn){
  navigator.clipboard.writeText(text);
  btn.textContent='Copied!';
  btn.style.color='#22c55e';
  setTimeout(function(){btn.textContent='Copy';btn.style.color='';},2000);
}
async function verify(){
  var code=document.getElementById('verify-code').value.padStart(6,'0');
  if(!/^\\d{6}$/.test(code))return;
  try{
    var res=await fetch('/admin/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code${keyField}})});
    if(res.ok){window.location.href='/';}
    else{showErr();}
  }catch(_){showErr();}
}
function showErr(){
  var err=document.getElementById('verify-err');
  err.style.display='block';
  setTimeout(function(){err.style.display='none';},3000);
}
</script></body></html>`;
}

// GET /admin/setup — one-time TOTP enrollment (bootstrap-secret gated).
admin.get("/admin/setup", async (c) => {
  if ((await c.env.CACHE.get("admin_setup_complete")) === "1") return c.redirect("/admin/login", 302);
  if (!setupAuthorized(c)) {
    return c.html(`<!DOCTYPE html><body style="background:#050505;color:#71717a;font-family:system-ui;display:flex;height:100vh;align-items:center;justify-content:center;text-align:center"><div><div style="color:#ef4444;font-size:40px">◆</div><p>Setup locked.<br/>Open <code>/admin/setup?key=YOUR_BOOTSTRAP_SECRET</code></p></div></body>`, 403);
  }
  let secret = await c.env.CACHE.get("admin_totp_secret");
  if (!secret) { secret = base32Encode(crypto.getRandomValues(new Uint8Array(20))); await c.env.CACHE.put("admin_totp_secret", secret); }
  return c.html(setupPage(secret, c.req.query("key")));
});

// POST /admin/setup — verify first code, lock setup, log in.
admin.post("/admin/setup", async (c) => {
  if ((await c.env.CACHE.get("admin_setup_complete")) === "1") return c.json({ error: "already set up" }, 409);
  const body = (await c.req.json().catch(() => ({}))) as { code?: string; key?: string };
  if (!setupAuthorized(c, body.key)) return c.json({ error: "unauthorized" }, 403);
  const secret = await c.env.CACHE.get("admin_totp_secret");
  if (!secret || !body.code || !(await totpVerify(secret, body.code))) return c.json({ error: "invalid code" }, 401);
  await c.env.CACHE.put("admin_setup_complete", "1");
  await createSession(c);
  return c.json({ ok: true });
});

// GET /admin/login — TOTP code entry.
admin.get("/admin/login", async (c) => {
  if (await isAuthed(c)) return c.redirect("/", 302);
  if ((await c.env.CACHE.get("admin_setup_complete")) !== "1") return c.redirect("/admin/setup", 302);
  return c.html(codePage({ title: "Login", sub: "Intelligence Console", action: "/admin/login" }));
});

// POST /admin/login — verify TOTP, create session.
admin.post("/admin/login", async (c) => {
  const ip = c.req.header("cf-connecting-ip") || "unknown";
  if ((await bumpRateWindow(c.env, `adminlogin:${ip}`, 3600, Date.now())) > 5) return c.json({ error: "too many attempts" }, 429);
  if ((await c.env.CACHE.get("admin_setup_complete")) !== "1") return c.json({ error: "not configured" }, 503);
  const secret = await c.env.CACHE.get("admin_totp_secret");
  const body = (await c.req.json().catch(() => ({}))) as { code?: string };
  if (!secret || !body.code || !(await totpVerify(secret, body.code))) return c.json({ error: "invalid code" }, 401);
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
    scalar(env, `SELECT COUNT(*) FROM api_keys WHERE created_at >= ?`, sod),
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
    cards.push(`<div class="card"><h3>🚨 Security Alert</h3><p>Key <span style="font-family:var(--mono)">${esc(a.api_key_id)}</span> has trust ${Number(a.trust_score).toFixed(2)} with ${fmt(Number(a.flagged_writes))} flagged write(s). Auto-flagged by the trust engine.</p><a class="btn" href="/security">Review →</a></div>`);
  } else if (totalMem > 0) {
    cards.push(`<div class="card"><h3>🛡️ Security</h3><p>All agents are healthy — no keys below 0.5 trust, none blocked.</p><a class="btn ghost" href="/security">Open security →</a></div>`);
  }
  const opp = await scalar(env, `SELECT COUNT(*) FROM api_keys WHERE tier!='pro' AND revoked=0 AND monthly_usage > 8000`);
  if (opp > 0) {
    cards.push(`<div class="card"><h3>💡 Opportunity</h3><p>${fmt(opp)} free-tier key(s) are over 8,000 operations this month — close to the 10k line. A good moment for an upgrade nudge.</p><a class="btn" href="/agents">See agents →</a></div>`);
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
      <div class="tags"><span>${esc(m.category ?? "other")}</span><span>importance ${Number(m.importance)}</span></div>
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
    ? `<span class="dot" style="background:var(--err)"></span> ${blocked} key(s) blocked`
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
  const body = `${incident}<div class="card"><div class="statusline">${status}</div></div><div class="card"><h3 style="color:var(--tx);font-size:15px;margin-bottom:14px">Trust distribution</h3>${distHtml}</div><div class="card"><h3 style="color:var(--tx);font-size:15px;margin-bottom:6px">Recent events</h3>${evHtml}</div>`;
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
