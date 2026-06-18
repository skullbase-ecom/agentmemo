import type { Env } from "./types";
import { classifySample } from "./lib/classify";

// The Observatory — a public, no-auth, anonymized live view of the agentic web.
// Shows aggregate counts and an AI-classified category distribution across ALL
// agents. Never exposes content, user ids, agent ids, or API keys — only totals.

export interface ObservatoryReport {
  generated_at: number;
  privacy: string;
  totals: {
    memories: number;
    episodes: number;
    procedures: number;
    emotional_memories: number;
    active_agents: number;
    memories_today: number;
  };
  memory_type_distribution: Record<string, number>;
  categories: Record<string, number>;
  category_sample_size: number;
  daily: { day: string; memories: number }[];
}

async function count(env: Env, sql: string): Promise<number> {
  const r = await env.DB.prepare(sql).first<{ n: number }>().catch(() => null);
  return r?.n ?? 0;
}

export async function runObservatory(env: Env, now: number): Promise<ObservatoryReport> {
  const cached = (await env.CACHE.get("observatory:report", "json").catch(() => null)) as
    | ObservatoryReport
    | null;
  if (cached) return cached;

  const startOfDay = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );

  const [memories, episodes, procedures, emotional, agents, today] = await Promise.all([
    count(env, "SELECT COUNT(*) AS n FROM memories"),
    count(env, "SELECT COUNT(*) AS n FROM episodes"),
    count(env, "SELECT COUNT(*) AS n FROM procedures"),
    count(env, "SELECT COUNT(*) AS n FROM emotional_memories"),
    count(env, "SELECT COUNT(DISTINCT agent_id) AS n FROM memories"),
    count(env, `SELECT COUNT(*) AS n FROM memories WHERE created_at >= ${startOfDay}`),
  ]);

  // Anonymized sample of recent memory contents for category classification.
  const { results: sample } = await env.DB.prepare(
    "SELECT content FROM memories ORDER BY created_at DESC LIMIT 50",
  )
    .all<{ content: string }>()
    .catch(() => ({ results: [] as { content: string }[] }));
  const contents = (sample ?? []).map((r) => r.content);
  const categories = await classifySample(env, contents);

  // Last 7 days of memory creation (counts only).
  const { results: daily } = await env.DB.prepare(
    `SELECT date(created_at/1000,'unixepoch') AS day, COUNT(*) AS memories
     FROM memories WHERE created_at >= ${now - 7 * 86_400_000}
     GROUP BY day ORDER BY day DESC LIMIT 7`,
  )
    .all<{ day: string; memories: number }>()
    .catch(() => ({ results: [] as { day: string; memories: number }[] }));

  const report: ObservatoryReport = {
    generated_at: now,
    privacy: "Aggregated and anonymized. No memory content, user ids, agent ids, or API keys are exposed.",
    totals: {
      memories,
      episodes,
      procedures,
      emotional_memories: emotional,
      active_agents: agents,
      memories_today: today,
    },
    memory_type_distribution: {
      semantic: memories,
      episodic: episodes,
      procedural: procedures,
      emotional: emotional,
    },
    categories,
    category_sample_size: contents.length,
    daily: daily ?? [],
  };

  await env.CACHE.put("observatory:report", JSON.stringify(report), { expirationTtl: 120 }).catch(
    () => {},
  );
  return report;
}

export const OBSERVATORY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Observatory — AgentMemo</title>
<meta name="description" content="The Observatory — a live, anonymized view of what AI agents are remembering across the agentic web." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://agentmemo.dev/observatory" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root { --bg:#050505; --panel:#141414; --border:#1f1f1f; --text:#f5f5f5; --muted:#737373; --faint:#404040; --accent:#8b5cf6; --accent2:#06b6d4; --green:#22c55e; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  .accent-text { background:linear-gradient(90deg,var(--accent),var(--accent2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  nav { border-bottom:1px solid var(--border); }
  nav .inner { max-width:980px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; }
  .logo .dot { width:10px; height:10px; border-radius:50%; background:var(--accent); box-shadow:0 0 12px var(--accent); }
  nav .links { display:flex; gap:22px; font-size:14px; } nav .links a { color:var(--muted); } nav .links a:hover { color:var(--text); }
  .wrap { max-width:980px; margin:0 auto; padding:48px 24px 90px; }
  h1 { font-size:clamp(30px,5vw,46px); font-weight:800; letter-spacing:-.03em; }
  .sub { color:var(--muted); margin:10px 0 8px; max-width:620px; }
  .live { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); margin-bottom:30px; }
  .live .pulse { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 0 0 rgba(34,197,94,.6); animation:pulse 2s infinite; }
  @keyframes pulse { 70% { box-shadow:0 0 0 8px rgba(34,197,94,0);} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0);} }
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:30px; }
  .stat { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:20px; }
  .stat .n { font-size:30px; font-weight:800; letter-spacing:-.02em; }
  .stat .l { color:var(--muted); font-size:13px; margin-top:4px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .card { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:24px; }
  .card h2 { font-size:16px; margin-bottom:16px; }
  .bar { margin-bottom:12px; }
  .bar .top { display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px; }
  .bar .top .v { color:var(--muted); }
  .track { height:8px; background:#0a0a0a; border-radius:6px; overflow:hidden; }
  .fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:6px; transition:width .5s; }
  .note { color:var(--faint); font-size:12.5px; margin-top:26px; }
  footer { border-top:1px solid var(--border); padding:28px 0; color:var(--faint); font-size:13px; text-align:center; }
  @media (max-width:720px){ .stats{grid-template-columns:1fr 1fr;} .grid2{grid-template-columns:1fr;} nav .links a.hide{display:none;} }
</style>
</head>
<body>
<nav><div class="inner">
  <a href="/" class="logo"><span class="dot"></span> AgentMemo</a>
  <div class="links"><a href="/docs" class="hide">Docs</a><a href="/observatory">Observatory</a><a href="/status">Status</a></div>
</div></nav>

<div class="wrap">
  <h1>The <span class="accent-text">Observatory</span></h1>
  <p class="sub">A live, anonymized view of what AI agents are remembering across the agentic web. No content, no identities — just the shape of machine memory.</p>
  <div class="live"><span class="pulse"></span> Live · refreshes every 30s · <a class="accent-text" href="/observatory.json">observatory.json</a></div>

  <div class="stats" id="stats"></div>
  <div class="grid2">
    <div class="card"><h2>Memory categories <span style="color:var(--faint);font-weight:400" id="sampleNote"></span></h2><div id="categories"></div></div>
    <div class="card"><h2>By memory type</h2><div id="types"></div></div>
  </div>
  <p class="note" id="privacy"></p>
</div>

<footer>© 2026 AgentMemo · <a href="/">Home</a> · <a href="/observatory.json">observatory.json</a></footer>

<script>
  function bars(el, obj){
    var entries = Object.entries(obj).sort(function(a,b){return b[1]-a[1];});
    var max = Math.max(1, ...entries.map(function(e){return e[1];}));
    el.innerHTML = entries.map(function(e){
      var pct = Math.round((e[1]/max)*100);
      return '<div class="bar"><div class="top"><span>'+e[0]+'</span><span class="v">'+e[1]+'</span></div><div class="track"><div class="fill" style="width:'+pct+'%"></div></div></div>';
    }).join('');
  }
  async function load(){
    try {
      var d = await (await fetch('/observatory.json',{cache:'no-store'})).json();
      var t = d.totals;
      var stats = [
        ['memories', t.memories], ['active agents', t.active_agents], ['stored today', t.memories_today],
        ['episodes', t.episodes], ['procedures', t.procedures], ['emotional', t.emotional_memories]
      ];
      document.getElementById('stats').innerHTML = stats.map(function(s){
        return '<div class="stat"><div class="n">'+Number(s[1]).toLocaleString()+'</div><div class="l">'+s[0]+'</div></div>';
      }).join('');
      bars(document.getElementById('categories'), d.categories);
      bars(document.getElementById('types'), d.memory_type_distribution);
      document.getElementById('sampleNote').textContent = '(sample of '+d.category_sample_size+')';
      document.getElementById('privacy').textContent = d.privacy;
    } catch(e){}
  }
  load(); setInterval(load, 30000);
</script>
</body>
</html>`;
