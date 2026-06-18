import type { Env } from "./types";
import { embed } from "./lib/embeddings";

// Live status. /status.json runs real component checks (cached briefly in KV to
// avoid hammering Workers AI); /status renders them and auto-refreshes.

const LAUNCH = Date.UTC(2026, 5, 18); // 2026-06-18

interface Component {
  status: "operational" | "degraded" | "down";
  latency_ms?: number;
  detail?: string;
}

export interface StatusReport {
  status: "operational" | "degraded";
  checked_at: number;
  live_since: string;
  uptime_days: number;
  components: {
    api: Component;
    database: Component;
    ai_embeddings: Component;
    cache: Component;
  };
}

async function timed(fn: () => Promise<void>): Promise<Component> {
  const t = Date.now();
  try {
    await fn();
    return { status: "operational", latency_ms: Date.now() - t };
  } catch (err) {
    return { status: "down", detail: String(err).slice(0, 120) };
  }
}

export async function runStatusChecks(env: Env, now: number): Promise<StatusReport> {
  // Serve a cached report if fresh (keeps the AI check cheap).
  const cached = await env.CACHE.get("status:report", "json").catch(() => null);
  if (cached) return cached as StatusReport;

  const database = await timed(async () => {
    await env.DB.prepare("SELECT 1").first();
  });
  const ai_embeddings = await timed(async () => {
    const r = await embed(env, "ping");
    if (!r.vector.length) throw new Error("empty vector");
  });
  const cache = await timed(async () => {
    await env.CACHE.put("status:probe", "1", { expirationTtl: 60 });
    await env.CACHE.get("status:probe");
  });
  const api: Component = { status: "operational" };

  const all = [api, database, ai_embeddings, cache];
  const overall = all.every((c) => c.status === "operational") ? "operational" : "degraded";

  const report: StatusReport = {
    status: overall,
    checked_at: now,
    live_since: "2026-06-18",
    uptime_days: Math.max(0, Math.floor((now - LAUNCH) / 86_400_000)),
    components: { api, database, ai_embeddings, cache },
  };

  await env.CACHE.put("status:report", JSON.stringify(report), { expirationTtl: 20 }).catch(
    () => {},
  );
  return report;
}

export const STATUS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Status — AgentMemo</title>
<meta name="description" content="Live operational status of the AgentMemo API: health, database, AI embeddings, cache." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://agentmemo.dev/status" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root { --bg:#07080d; --bg-soft:#0d0f17; --panel:#11131d; --border:#1f2330; --text:#e7e9f0; --muted:#9097a8; --faint:#6b7280; --accent:#7c5cff; --accent-2:#19c2d6; --green:#2dd4a7; --amber:#f5b342; --red:#ff6b81; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  nav { border-bottom:1px solid var(--border); }
  nav .inner { max-width:860px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; }
  .logo .dot { width:26px; height:26px; border-radius:8px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:grid; place-items:center; font-size:15px; }
  nav .links { display:flex; gap:22px; font-size:14px; } nav .links a { color:var(--muted); } nav .links a:hover { color:var(--text); }
  .wrap { max-width:860px; margin:0 auto; padding:56px 24px 80px; }
  .banner { display:flex; align-items:center; gap:14px; background:linear-gradient(180deg,var(--panel),var(--bg-soft)); border:1px solid var(--border); border-radius:16px; padding:24px; margin-bottom:24px; }
  .dot-lg { width:14px; height:14px; border-radius:50%; flex-shrink:0; }
  .ok { background:var(--green); box-shadow:0 0 12px var(--green); } .deg { background:var(--amber); box-shadow:0 0 12px var(--amber); } .down { background:var(--red); box-shadow:0 0 12px var(--red); }
  .banner h1 { font-size:22px; font-weight:700; letter-spacing:-.01em; }
  .banner .sub { color:var(--muted); font-size:14px; }
  .row { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; background:var(--panel); border:1px solid var(--border); border-radius:12px; margin-bottom:12px; }
  .row .name { font-weight:600; } .row .meta { color:var(--faint); font-size:13px; margin-top:2px; }
  .pill { display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:600; }
  .pill.ok { color:var(--green); } .pill.deg { color:var(--amber); } .pill.down { color:var(--red); }
  .meta-row { display:flex; gap:28px; flex-wrap:wrap; color:var(--muted); font-size:14px; margin-top:22px; }
  .meta-row b { color:var(--text); }
  .foot { color:var(--faint); font-size:13px; margin-top:28px; }
  footer { border-top:1px solid var(--border); padding:28px 0; color:var(--faint); font-size:13px; text-align:center; }
</style>
</head>
<body>
<nav><div class="inner">
  <a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
  <div class="links"><a href="/docs">Docs</a><a href="/changelog">Changelog</a><a href="/status">Status</a></div>
</div></nav>

<div class="wrap">
  <div class="banner">
    <span class="dot-lg ok" id="overallDot"></span>
    <div>
      <h1 id="overallText">Checking status…</h1>
      <div class="sub" id="checkedAt"></div>
    </div>
  </div>
  <div id="components"></div>
  <div class="meta-row">
    <div>Live since <b id="since">—</b></div>
    <div>Uptime <b id="uptime">—</b></div>
    <div>Machine-readable: <a style="color:var(--accent-2)" href="/status.json">/status.json</a></div>
  </div>
  <div class="foot">Auto-refreshes every 30 seconds.</div>
</div>

<footer>© 2026 AgentMemo · <a href="/">Home</a> · <a href="/status.json">status.json</a></footer>

<script>
  var LABELS = { api: "API", database: "Database", ai_embeddings: "AI embeddings", cache: "Cache" };
  function cls(s){ return s === "operational" ? "ok" : (s === "degraded" ? "deg" : "down"); }
  function label(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
  async function load(){
    try {
      var r = await fetch('/status.json', { cache: 'no-store' });
      var d = await r.json();
      document.getElementById('overallDot').className = 'dot-lg ' + cls(d.status);
      document.getElementById('overallText').textContent = d.status === 'operational' ? 'All systems operational' : 'Degraded performance';
      document.getElementById('checkedAt').textContent = 'Last checked ' + new Date(d.checked_at).toUTCString();
      document.getElementById('since').textContent = d.live_since;
      document.getElementById('uptime').textContent = d.uptime_days + ' days';
      var html = '';
      Object.keys(d.components).forEach(function(k){
        var c = d.components[k];
        var meta = (c.latency_ms != null ? c.latency_ms + ' ms' : (c.detail || ''));
        html += '<div class="row"><div><div class="name">' + LABELS[k] + '</div><div class="meta">' + meta + '</div></div>' +
          '<span class="pill ' + cls(c.status) + '"><span class="dot-lg ' + cls(c.status) + '" style="width:9px;height:9px;box-shadow:none"></span>' + label(c.status) + '</span></div>';
      });
      document.getElementById('components').innerHTML = html;
    } catch (e) {
      document.getElementById('overallText').textContent = 'Unable to load status';
      document.getElementById('overallDot').className = 'dot-lg down';
    }
  }
  load();
  setInterval(load, 30000);
</script>
</body>
</html>`;
