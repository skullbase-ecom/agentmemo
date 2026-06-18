// Content pages built on the shared design system (src/ui.ts).
import { shell } from "./ui";

const PAGE_CSS = `<style>
.hd{padding:72px 0 8px;text-align:center}
.hd h1{font-size:clamp(2.4rem,6vw,4rem);font-weight:800;letter-spacing:-.03em}
.hd p{color:var(--text-2);max-width:620px;margin:16px auto 0;font-size:1.1rem}
.prose{max-width:720px;margin:0 auto}.prose h2{font-size:24px;margin:40px 0 12px}.prose h3{font-size:18px;margin:26px 0 8px}
.prose p,.prose li{color:var(--text-2);margin:10px 0}.prose ul{margin-left:20px}
.prose .quote{font-size:28px;font-weight:700;letter-spacing:-.02em;color:var(--text);border-left:3px solid var(--accent);padding-left:20px;margin:30px 0}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.badge2{display:inline-block;font-size:11px;font-weight:700;color:var(--accent);background:var(--glow);padding:3px 9px;border-radius:999px;margin-left:8px}
input,select,textarea{width:100%;background:var(--code-bg);border:1px solid var(--border);border-radius:9px;padding:11px 13px;color:var(--text);font-size:14px;font-family:inherit;margin-bottom:12px;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--accent)}
label{display:block;font-size:12px;color:var(--text-muted);margin-bottom:6px}
.bars .bar{margin:10px 0}.bars .t{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}.bars .trk{height:7px;background:#0a0a0a;border-radius:5px;overflow:hidden}.bars .fl{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2))}
@media(max-width:860px){.grid3,.grid2{grid-template-columns:1fr}}
</style>`;

// ---- /security ----------------------------------------------------------
export const SECURITY_HTML = shell({
  title: "Security — AgentMemo",
  description: "AgentMemo security: OWASP ASI06 protection, trust scoring, poisoning protection, full audit trail, data isolation, and GDPR compliance.",
  path: "/security",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>Security <span class="accent-text">first</span>.</h1><p>The only agent memory API with OWASP ASI06 protection built into the write path.</p></div>
<section class="section"><div class="wrap prose">
  <h2 id="owasp">OWASP ASI06 — memory poisoning protection</h2>
  <p>ASI06 covers memory and context poisoning of AI agents. AgentMemo defends the write path: every memory is content-hashed, classified, and scored before it is trusted.</p>
  <h2 id="trust">Trust scoring</h2>
  <p>Each API key carries a trust score (0–1, starts at 1.0). Suspicious patterns — burst writes, repeated contradictory content, spam — lower it. Writes from keys below 0.3 are blocked with a <span class="mono">403 trust_score_too_low</span>. Normal usage rebuilds trust over time.</p>
  <h2 id="audit">Full audit trail</h2>
  <p>Every store, retrieve, forget, verify, and feedback is written to an append-only audit log with timestamp, action, trust score, and outcome — essential for enterprise compliance.</p>
  <h2>Data isolation</h2>
  <p>All memory is isolated by <span class="mono">(api_key, user_id, agent_id)</span>. One key can never read or delete another tenant's data.</p>
  <h2 id="gdpr">GDPR compliance</h2>
  <p>Right to access: <span class="mono">GET /users/:id/memories</span>. Right to be forgotten: <span class="mono">DELETE /users/:id/memories</span> removes all memories, emotional records, and episodes for a user.</p>
  <h2>Responsible disclosure</h2>
  <p>Found a vulnerability? Email <span class="mono">security@agentmemo.dev</span>. We respond within 72 hours.</p>
</div></section>`,
});

// ---- /manifesto ---------------------------------------------------------
export const MANIFESTO_HTML = shell({
  title: "Manifesto — AgentMemo",
  description: "What we believe and what we commit to. Memory infrastructure for the agentic web.",
  path: "/manifesto",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>The <span class="accent-text">Manifesto</span></h1></div>
<section class="section"><div class="wrap prose">
  <p class="quote">Every agent needs a memory.</p>
  <h2>We believe</h2>
  <ul>
    <li>Agent memory should outlive any single LLM.</li>
    <li>Developers should own their agent's memories.</li>
    <li>Memory infrastructure should be transparent.</li>
    <li>Agents deserve the same persistence as humans.</li>
    <li>The agentic web needs neutral infrastructure.</li>
  </ul>
  <h2>We commit to</h2>
  <ul>
    <li>99.9% uptime, published publicly.</li>
    <li>Never selling individual memory data.</li>
    <li>Open-sourcing our core.</li>
    <li>Publishing our architecture openly.</li>
    <li>Full data portability, forever.</li>
    <li>Honest benchmarks.</li>
  </ul>
  <p style="margin-top:40px">Built in India 🇮🇳 — for the world.</p>
</div></section>`,
});

// ---- /benchmarks --------------------------------------------------------
export const BENCHMARKS_HTML = shell({
  title: "Benchmarks — AgentMemo",
  description: "Honest, published AgentMemo benchmarks: live latency (p50/p95/p99) measured from your browser, and a transparent feature comparison.",
  path: "/benchmarks",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>Honest <span class="accent-text">benchmarks</span>.</h1><p>We publish real numbers — even the ones still in progress. Latency below is measured live from your browser right now.</p></div>
<section class="section"><div class="wrap prose">
  <h2>Live latency <span class="badge2">measured now</span></h2>
  <p class="muted">Round-trip to <span class="mono">/health</span>, 20 samples from your location.</p>
  <div class="grid3" style="margin:18px 0">
    <div class="card"><div style="font-size:30px;font-weight:800" id="p50">…</div><div class="muted">p50</div></div>
    <div class="card"><div style="font-size:30px;font-weight:800" id="p95">…</div><div class="muted">p95</div></div>
    <div class="card"><div style="font-size:30px;font-weight:800" id="p99">…</div><div class="muted">p99</div></div>
  </div>
  <h2>Memory recall accuracy</h2>
  <p>Recall benchmarks (e.g. LongMemEval) are <b style="color:var(--text)">not yet independently benchmarked — coming soon</b>. We will publish the full methodology and raw scores here, honestly, when complete.</p>
  <h2>Feature comparison</h2>
  <p>See the transparent comparison vs Mem0 and Zep on the <a class="accent-text" href="/#compare">home page</a>.</p>
  <p class="muted" style="margin-top:30px" id="tested">Last tested: live</p>
</div></section>
<script>
(async function(){var t=[];for(var i=0;i<20;i++){var s=performance.now();try{await fetch('/health',{cache:'no-store'})}catch(e){}t.push(performance.now()-s)}
t.sort(function(a,b){return a-b});function q(p){return Math.round(t[Math.min(t.length-1,Math.floor(t.length*p))])+'ms'}
document.getElementById('p50').textContent=q(.5);document.getElementById('p95').textContent=q(.95);document.getElementById('p99').textContent=q(.99);
document.getElementById('tested').textContent='Measured '+new Date().toUTCString();})();
</script>`,
});

// ---- /docs/agent-payments ----------------------------------------------
export const AGENT_PAYMENTS_HTML = shell({
  title: "Agent Payments — AgentMemo",
  description: "Agents upgrade themselves to Pro programmatically via the Dodo Payments MCP server (Code Mode). No human needed.",
  path: "/docs/agent-payments",
  ogType: "article",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>Agents pay for <span class="accent-text">themselves</span>.</h1><p>An autonomous agent can hit its free-tier ceiling, purchase a Pro upgrade, and keep working — with no human in the loop — using the Dodo Payments MCP server.</p></div>
<section class="section"><div class="wrap prose">
  <div class="card" style="border-left:3px solid var(--accent);margin-bottom:8px">
    <strong style="color:var(--text)">Dodo Payments Code Mode.</strong>
    <p class="muted" style="margin-top:6px">Instead of exposing hundreds of API endpoints as separate tools, Dodo uses just <b style="color:var(--text)">2 tools</b> — keeping the agent's context window lean and execution fast:</p>
    <ul>
      <li><code>docs_search</code> — searches Dodo documentation.</li>
      <li><code>code_execution</code> — writes + runs TypeScript in a sandbox against the Dodo SDK.</li>
    </ul>
  </div>

  <h2>Step 1 — Agent connects the Dodo MCP servers</h2>
  <p>Add Dodo's knowledge + payments MCP servers to the agent's MCP config (alongside AgentMemo's memory server).</p>
  <div class="codewin"><div class="codebar"><span class="lbl">mcp config</span></div>
<pre class="code">{
  <span class="p">"mcpServers"</span>: {
    <span class="p">"dodo-knowledge"</span>: {
      <span class="p">"command"</span>: <span class="s">"npx"</span>,
      <span class="p">"args"</span>: [<span class="s">"-y"</span>, <span class="s">"mcp-remote@latest"</span>,
               <span class="s">"https://knowledge.dodopayments.com/mcp"</span>]
    },
    <span class="p">"dodopayments"</span>: {
      <span class="p">"command"</span>: <span class="s">"npx"</span>,
      <span class="p">"args"</span>: [<span class="s">"-y"</span>, <span class="s">"mcp-remote@latest"</span>,
               <span class="s">"https://mcp.dodopayments.com/sse"</span>]
    }
  }
}</pre></div>

  <h2>Step 2 — Agent signs up for AgentMemo</h2>
  <div class="codewin"><div class="codebar"><span class="lbl">cURL</span></div>
<pre class="code"><span class="f">curl</span> -X POST <span class="tok-m">https://agentmemo.dev/signup</span> \\
  -H <span class="s">"Content-Type: application/json"</span> \\
  -d <span class="s">'{"name": "my-agent"}'</span></pre></div>
  <div class="codewin"><div class="codebar"><span class="lbl">response</span></div>
<pre class="code">{
  <span class="p">"api_key"</span>: <span class="s">"am_sk_xxx"</span>,
  <span class="p">"tier"</span>: <span class="s">"free"</span>,
  <span class="p">"upgrade_via_mcp"</span>: {
    <span class="p">"dodo_mcp"</span>: <span class="s">"https://mcp.dodopayments.com/sse"</span>,
    <span class="p">"product_id"</span>: <span class="s">"pdt_0NhKvw8RSLuiPu2bD2IQH"</span>
  }
}</pre></div>

  <h2>Step 3 — Agent pays itself via the Dodo MCP</h2>
  <p>The agent calls the <code>code_execution</code> tool to run TypeScript against the Dodo SDK:</p>
  <div class="codewin"><div class="codebar"><span class="lbl">code_execution (TypeScript)</span></div>
<pre class="code"><span class="k">import</span> DodoPayments <span class="k">from</span> <span class="s">"dodopayments"</span>;

<span class="k">const</span> client = <span class="k">new</span> <span class="f">DodoPayments</span>({
  bearerToken: process.env.<span class="p">DODO_PAYMENTS_API_KEY</span>
});

<span class="k">const</span> subscription = <span class="k">await</span> client.subscriptions.<span class="f">create</span>({
  product_id: <span class="s">"pdt_0NhKvw8RSLuiPu2bD2IQH"</span>,
  quantity: <span class="m">1</span>
});

console.<span class="f">log</span>(<span class="s">"Subscribed:"</span>, subscription.id);</pre></div>

  <h2>Step 4 — Webhook auto-upgrades AgentMemo</h2>
  <p>Dodo fires a signed webhook to <code>agentmemo.dev/webhooks/dodo</code>. AgentMemo verifies it and upgrades the <code>api_key</code> to <b>Pro</b> automatically. The agent now has unlimited memory operations — its very next <code>/memory/store</code> call already runs on Pro.</p>

  <div class="card" style="border-left:3px solid var(--accent);margin-top:24px">
    <strong style="color:var(--text)">No human needed — agents upgrade themselves.</strong>
    <p class="muted" style="margin-top:6px">Discovery → payment → upgrade is fully programmatic. This is what fully autonomous agent operation looks like.</p>
  </div>

  <p style="margin-top:24px"><a class="accent-text" href="/pricing">See pricing →</a> · <a class="accent-text" href="/docs#mcp">MCP docs →</a></p>
</div></section>`,
});

// ---- /integrations ------------------------------------------------------
const INTEGRATIONS = [
  ["Claude Managed Agents", "🤖", "Add memory in one line of MCP JSON.", true],
  ["Cursor / Claude Code", "🖱️", "Native MCP server — add to mcp.json.", false],
  ["LangChain", "🦜", "Use as a memory backend via REST or SDK.", false],
  ["CrewAI", "👥", "Shared memory across your crew of agents.", false],
  ["AutoGen", "⚙️", "Persist conversations across runs.", false],
  ["Vercel AI SDK", "▲", "Call the JS SDK from any route handler.", false],
  ["OpenAI Agents SDK", "🧠", "Model-agnostic memory for GPT agents.", false],
];
export const INTEGRATIONS_HTML = shell({
  title: "Integrations — AgentMemo",
  description: "Use AgentMemo with Claude Managed Agents, Cursor, LangChain, CrewAI, AutoGen, the Vercel AI SDK, and the OpenAI Agents SDK.",
  path: "/integrations",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>Integrations</h1><p>Model-agnostic memory that works everywhere agents are built.</p></div>
<section class="section"><div class="wrap">
  <div class="grid3">${INTEGRATIONS.map(([n, i, d, feat]) => `<div class="card"><div style="font-size:24px">${i}</div><h3 style="margin:10px 0 6px">${n}${feat ? '<span class="badge2">new</span>' : ""}</h3><p class="muted" style="font-size:14px">${d}</p><a class="accent-text" style="font-size:13px;display:inline-block;margin-top:10px" href="/docs#mcp">View docs →</a></div>`).join("")}</div>
</div></section>`,
});

// ---- /playground --------------------------------------------------------
export const PLAYGROUND_HTML = shell({
  title: "Playground — AgentMemo",
  description: "Try the AgentMemo API live in your browser. Real requests, no setup.",
  path: "/playground",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>Play<span class="accent-text">ground</span></h1><p>Real API calls to agentmemo.dev. Grab a free key, pick an endpoint, hit Run.</p></div>
<section class="section"><div class="wrap"><div class="grid2">
  <div class="card">
    <label>API key</label>
    <input id="pk" placeholder="am_sk_... (or click Get a key)"/>
    <button class="btn btn-ghost" id="getkey" style="margin-bottom:14px">Get a free key</button>
    <label>Endpoint</label>
    <select id="ep">
      <option value="store">POST /memory/store</option>
      <option value="retrieve">GET /memory/retrieve</option>
      <option value="context">GET /memory/context</option>
      <option value="stats">GET /memory/stats</option>
      <option value="usage">GET /usage</option>
    </select>
    <label>Body / params (JSON)</label>
    <textarea id="pb" rows="6">{"user_id":"u1","agent_id":"a1","content":"User prefers dark mode"}</textarea>
    <button class="btn btn-primary" id="run" style="width:100%;justify-content:center">Run →</button>
  </div>
  <div class="card"><label>Response</label><pre class="code" id="resp" style="min-height:300px;white-space:pre-wrap">// response appears here</pre></div>
</div></div></section>
<script>
var B='https://agentmemo.dev';
document.getElementById('getkey').onclick=async function(){this.textContent='…';try{var r=await (await fetch('/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'playground'})})).json();document.getElementById('pk').value=r.api_key;this.textContent='Key ready ✓'}catch(e){this.textContent='Get a free key'}};
document.getElementById('run').onclick=async function(){
  var key=document.getElementById('pk').value.trim(),ep=document.getElementById('ep').value,raw=document.getElementById('pb').value;
  var resp=document.getElementById('resp');resp.textContent='…';
  var H={'Authorization':'Bearer '+key};
  try{
    var body={};try{body=JSON.parse(raw||'{}')}catch(e){}
    var res;
    if(ep==='store'){res=await fetch(B+'/memory/store',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},H),body:JSON.stringify(body)})}
    else if(ep==='retrieve'){var q=new URLSearchParams({user_id:body.user_id||'u1',q:body.q||body.query||'preferences'});res=await fetch(B+'/memory/retrieve?'+q,{headers:H})}
    else if(ep==='context'){var q2=new URLSearchParams({user_id:body.user_id||'u1',format:body.format||'anthropic'});res=await fetch(B+'/memory/context?'+q2,{headers:H})}
    else if(ep==='stats'){res=await fetch(B+'/memory/stats?'+new URLSearchParams(body.user_id?{user_id:body.user_id}:{}),{headers:H})}
    else{res=await fetch(B+'/usage',{headers:H})}
    var j=await res.json();resp.textContent=res.status+'\\n'+JSON.stringify(j,null,2);
  }catch(e){resp.textContent='Error: '+e.message}
};
</script>`,
});

// ---- /blog --------------------------------------------------------------
const ARTICLES: Record<string, { title: string; date: string; body: string }> = {
  "model-agnostic-memory": {
    title: "Why agent memory should be model-agnostic",
    date: "June 19, 2026",
    body: `<p>Models come and go. The model your agent runs on today may be deprecated next year — and when it is, your agent shouldn't lose everything it learned.</p>
    <p>That's the case for keeping memory <b>outside</b> the model. AgentMemo stores memories as plain text + embeddings behind a neutral API. Swap Claude for GPT for Llama; the memory layer doesn't change. Your agent keeps its history, its preferences, its context.</p>
    <p>Memory is infrastructure, not a model feature. Own it separately.</p>`,
  },
  "claude-managed-agents-memory": {
    title: "Add persistent memory to Claude Managed Agents in one line of JSON",
    date: "June 19, 2026",
    body: `<p>Claude Managed Agents support MCP servers. AgentMemo is an MCP-native memory server, so wiring it up is a single block:</p>
    <pre class="code mono">{ "mcp_servers": [{ "type":"url", "name":"agentmemo", "url":"https://agentmemo.dev/mcp", "authorization_token":"Bearer am_sk_..." }] }</pre>
    <p>Your agent now has <span class="mono">store_memory</span>, <span class="mono">retrieve_memory</span>, <span class="mono">get_context</span>, and more — across every session.</p>`,
  },
  "honest-comparison": {
    title: "AgentMemo vs Mem0: an honest comparison",
    date: "June 19, 2026",
    body: `<p>We'll be transparent about where we win and where we don't. AgentMemo leads on edge deployment, MCP-native tooling, auth.md discovery, OWASP ASI06 protection, and a full audit trail. Mem0 and Zep are more mature on graph and temporal knowledge graphs — areas on our roadmap.</p>
    <p>Pick the tool that fits. If you want neutral, secure, edge-deployed, agent-native memory, that's us. See the <a class="accent-text" href="/#compare">comparison table</a>.</p>`,
  },
};

export const BLOG_INDEX_HTML = shell({
  title: "Blog — AgentMemo",
  description: "Writing on agent memory, the agentic web, and building neutral infrastructure.",
  path: "/blog",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>Blog</h1></div>
<section class="section"><div class="wrap prose">
  ${Object.entries(ARTICLES).map(([slug, a]) => `<a href="/blog/${slug}" class="card" style="display:block;margin-bottom:16px"><div class="muted" style="font-size:13px">${a.date}</div><h3 style="margin-top:6px">${a.title}</h3></a>`).join("")}
</div></section>`,
});

export function blogArticle(slug: string): string | null {
  const a = ARTICLES[slug];
  if (!a) return null;
  return shell({
    title: `${a.title} — AgentMemo`,
    description: a.title,
    path: `/blog/${slug}`,
    ogType: "article",
    body: `${PAGE_CSS}<article class="section"><div class="wrap prose"><div class="muted" style="font-size:13px">${a.date}</div><h1 style="font-size:2.2rem;font-weight:800;margin:8px 0 20px">${a.title}</h1>${a.body}<p style="margin-top:30px"><a class="accent-text" href="/blog">← All posts</a></p></div></article>`,
  });
}

// ---- /use-cases ---------------------------------------------------------
const USECASES: Record<string, { title: string; problem: string; solution: string }> = {
  "customer-support": {
    title: "Customer support agents",
    problem: "Support agents forget every prior ticket, so customers repeat themselves.",
    solution: "Store ticket history, preferences, and sentiment. Retrieve context the moment a customer returns, and track an emotional profile + trust score over time.",
  },
  "coding-agents": {
    title: "Coding agents",
    problem: "Coding agents re-learn your codebase conventions on every session.",
    solution: "Store architecture decisions and conventions as semantic memory, and store how-to workflows as procedural memory the agent can match to the current task.",
  },
  "research-agents": {
    title: "Research agents",
    problem: "Research agents lose findings and can't track contradicting evidence.",
    solution: "Accumulate findings, link supporting and contradicting sources in the memory graph, and surface conflicts automatically.",
  },
};

export const USECASES_INDEX_HTML = shell({
  title: "Use cases — AgentMemo",
  description: "How AgentMemo powers customer-support, coding, and research agents.",
  path: "/use-cases",
  body: `${PAGE_CSS}
<div class="hd wrap"><h1>Use cases</h1></div>
<section class="section"><div class="wrap"><div class="grid3">
  ${Object.entries(USECASES).map(([slug, u]) => `<a href="/use-cases/${slug}" class="card"><h3>${u.title}</h3><p class="muted" style="font-size:14px;margin-top:8px">${u.problem}</p><span class="accent-text" style="font-size:13px;display:inline-block;margin-top:10px">Read →</span></a>`).join("")}
</div></div></section>`,
});

export function useCase(slug: string): string | null {
  const u = USECASES[slug];
  if (!u) return null;
  return shell({
    title: `${u.title} — AgentMemo`,
    description: u.solution,
    path: `/use-cases/${slug}`,
    body: `${PAGE_CSS}<div class="hd wrap"><h1>${u.title}</h1></div>
<section class="section"><div class="wrap prose">
  <h2>The problem</h2><p>${u.problem}</p>
  <h2>The solution</h2><p>${u.solution}</p>
  <h2>Get started</h2><p><a class="accent-text" href="/signup">Get a free API key →</a> · <a class="accent-text" href="/docs">Read the docs</a></p>
  <p style="margin-top:24px"><a class="accent-text" href="/use-cases">← All use cases</a></p>
</div></section>`,
  });
}
