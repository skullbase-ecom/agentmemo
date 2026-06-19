import type { Env } from "./types";
import { classifySample } from "./lib/classify";
import { shell } from "./ui";

// The Observatory — a public, no-auth, anonymized live view of the agentic web.
// Shows aggregate counts and an AI-classified category distribution across ALL
// agents. Never exposes content, user ids, agent ids, or API keys — only totals.

export interface ObservatoryReport {
  generated_at: number;
  privacy: string;
  // Flat headline metrics consumed by the landing-page metrics bar.
  total_memories: number;
  active_agents: number;
  total_signups: number;
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

  const [memories, episodes, procedures, emotional, agents, today, signups, active24h] = await Promise.all([
    count(env, "SELECT COUNT(*) AS n FROM memories"),
    count(env, "SELECT COUNT(*) AS n FROM episodes"),
    count(env, "SELECT COUNT(*) AS n FROM procedures"),
    count(env, "SELECT COUNT(*) AS n FROM emotional_memories"),
    count(env, "SELECT COUNT(DISTINCT agent_id) AS n FROM memories"),
    count(env, `SELECT COUNT(*) AS n FROM memories WHERE created_at >= ${startOfDay}`),
    count(env, "SELECT COUNT(*) AS n FROM api_keys WHERE revoked = 0"),
    count(env, `SELECT COUNT(DISTINCT agent_id) AS n FROM memories WHERE created_at > ${now - 86_400_000}`),
  ]);

  const { results: sample } = await env.DB.prepare(
    "SELECT content FROM memories ORDER BY created_at DESC LIMIT 50",
  )
    .all<{ content: string }>()
    .catch(() => ({ results: [] as { content: string }[] }));
  const contents = (sample ?? []).map((r) => r.content);
  const categories = await classifySample(env, contents);

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
    total_memories: memories,
    active_agents: active24h,
    total_signups: signups,
    totals: { memories, episodes, procedures, emotional_memories: emotional, active_agents: agents, memories_today: today },
    memory_type_distribution: { semantic: memories, episodic: episodes, procedural: procedures, emotional: emotional },
    categories,
    category_sample_size: contents.length,
    daily: daily ?? [],
  };

  await env.CACHE.put("observatory:report", JSON.stringify(report), { expirationTtl: 120 }).catch(() => {});
  return report;
}

const STYLE = `<style>
.ob{padding:48px 0 90px}
.ob h1{font-size:clamp(2.2rem,5vw,3.2rem);font-weight:800}
.ob .sub{color:var(--text-2);max-width:620px;margin:10px 0 8px}
.live{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2);margin-bottom:28px}
.live .p{width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 8px var(--success)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
.stat{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px}
.stat .n{font-size:30px;font-weight:800}.stat .l{color:var(--text-muted);font-size:13px;margin-top:4px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.bar{margin-bottom:12px}.bar .t{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}.bar .t .v{color:var(--text-2)}
.trk{height:8px;background:#0a0a0a;border-radius:6px;overflow:hidden}.fl{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2))}
.note{color:var(--text-muted);font-size:12.5px;margin-top:24px}
@media(max-width:720px){.stats{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}}
</style>`;

const body = `${STYLE}<div class="ob wrap">
  <h1>The <span class="accent-text">Observatory</span></h1>
  <p class="sub">A live, anonymized view of what AI agents are remembering across the agentic web. No content, no identities — just the shape of machine memory.</p>
  <div class="live"><span class="p"></span> Live · refreshes every 30s · <a class="accent-text" href="/observatory.json">observatory.json</a></div>
  <div class="stats" id="stats"></div>
  <div class="g2">
    <div class="card"><h2 style="font-size:16px;margin-bottom:14px">Memory categories <span style="color:var(--faint);font-weight:400" id="sampleNote"></span></h2><div id="categories"></div></div>
    <div class="card"><h2 style="font-size:16px;margin-bottom:14px">By memory type</h2><div id="types"></div></div>
  </div>
  <p class="note" id="privacy"></p>
</div>
<script>
  function bars(el,obj){var e=Object.entries(obj).sort(function(a,b){return b[1]-a[1]});var mx=Math.max(1,...e.map(function(x){return x[1]}));
    el.innerHTML=e.map(function(x){var p=Math.round((x[1]/mx)*100);return '<div class="bar"><div class="t"><span>'+x[0]+'</span><span class="v">'+x[1]+'</span></div><div class="trk"><div class="fl" style="width:'+p+'%"></div></div></div>'}).join('')}
  async function load(){try{var d=await (await fetch('/observatory.json',{cache:'no-store'})).json();var t=d.totals;
    var s=[['memories',t.memories],['active agents',t.active_agents],['stored today',t.memories_today],['episodes',t.episodes],['procedures',t.procedures],['emotional',t.emotional_memories]];
    document.getElementById('stats').innerHTML=s.map(function(x){return '<div class="stat"><div class="n">'+Number(x[1]).toLocaleString()+'</div><div class="l">'+x[0]+'</div></div>'}).join('');
    bars(document.getElementById('categories'),d.categories);bars(document.getElementById('types'),d.memory_type_distribution);
    document.getElementById('sampleNote').textContent='(sample of '+d.category_sample_size+')';document.getElementById('privacy').textContent=d.privacy;
  }catch(e){}}
  load();setInterval(load,30000);
</script>`;

export const OBSERVATORY_HTML = shell({
  title: "Observatory — AgentMemo",
  description: "The Observatory — a live, anonymized view of what AI agents are remembering across the agentic web.",
  path: "/observatory",
  body,
});
