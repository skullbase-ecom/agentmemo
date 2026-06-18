import type { Env } from "./types";
import { embed } from "./lib/embeddings";
import { shell } from "./ui";

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

  await env.CACHE.put("status:report", JSON.stringify(report), { expirationTtl: 20 }).catch(() => {});
  return report;
}

const STYLE = `<style>
.st{padding:56px 0 90px;max-width:820px;margin:0 auto}
.banner{display:flex;align-items:center;gap:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:22px}
.dotL{width:14px;height:14px;border-radius:50%;flex-shrink:0}
.ok{background:var(--success);box-shadow:0 0 12px var(--success)}.deg{background:var(--warning);box-shadow:0 0 12px var(--warning)}.down{background:var(--error);box-shadow:0 0 12px var(--error)}
.banner h1{font-size:22px;font-weight:700}.banner .sub{color:var(--text-2);font-size:14px}
.row{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:12px}
.row .name{font-weight:600}.row .meta{color:var(--text-muted);font-size:13px;margin-top:2px}
.pill{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600}
.pill.ok{color:var(--success)}.pill.deg{color:var(--warning)}.pill.down{color:var(--error)}
.meta-row{display:flex;gap:28px;flex-wrap:wrap;color:var(--text-2);font-size:14px;margin-top:22px}.meta-row b{color:var(--text)}
.foot{color:var(--text-muted);font-size:13px;margin-top:24px}
</style>`;

const body = `${STYLE}<div class="st wrap">
  <div class="banner"><span class="dotL ok" id="overallDot"></span><div><h1 id="overallText">Checking status…</h1><div class="sub" id="checkedAt"></div></div></div>
  <div id="components"></div>
  <div class="meta-row"><div>Live since <b id="since">—</b></div><div>Uptime <b id="uptime">—</b></div><div>Machine-readable: <a class="accent-text" href="/status.json">/status.json</a></div></div>
  <div class="foot">Auto-refreshes every 30 seconds.</div>
</div>
<script>
  var LABELS={api:"API",database:"Database",ai_embeddings:"AI embeddings",cache:"Cache"};
  function cls(s){return s==="operational"?"ok":(s==="degraded"?"deg":"down")}
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  async function load(){try{
    var d=await (await fetch('/status.json',{cache:'no-store'})).json();
    document.getElementById('overallDot').className='dotL '+cls(d.status);
    document.getElementById('overallText').textContent=d.status==='operational'?'All systems operational':'Degraded performance';
    document.getElementById('checkedAt').textContent='Last checked '+new Date(d.checked_at).toUTCString();
    document.getElementById('since').textContent=d.live_since;document.getElementById('uptime').textContent=d.uptime_days+' days';
    var html='';Object.keys(d.components).forEach(function(k){var c=d.components[k];var meta=(c.latency_ms!=null?c.latency_ms+' ms':(c.detail||''));
      html+='<div class="row"><div><div class="name">'+LABELS[k]+'</div><div class="meta">'+meta+'</div></div><span class="pill '+cls(c.status)+'"><span class="dotL '+cls(c.status)+'" style="width:9px;height:9px;box-shadow:none"></span>'+cap(c.status)+'</span></div>';});
    document.getElementById('components').innerHTML=html;
  }catch(e){document.getElementById('overallText').textContent='Unable to load status';document.getElementById('overallDot').className='dotL down';}}
  load();setInterval(load,30000);
</script>`;

export const STATUS_HTML = shell({
  title: "Status — AgentMemo",
  description: "Live operational status of the AgentMemo API: health, database, AI embeddings, cache.",
  path: "/status",
  body,
});
