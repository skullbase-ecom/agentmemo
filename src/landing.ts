// Landing page — flagship, rebuilt on the shared design system (src/ui.ts).
import { shell } from "./ui";
import { JSON_LD } from "./discovery";

const STYLE = `<style>
.hero{position:relative;text-align:center;padding:96px 0 64px;overflow:hidden}
#particles{position:absolute;inset:0;z-index:0;opacity:.5}
.hero .inner{position:relative;z-index:1}
.badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-2);font-size:13px;margin-bottom:26px}
.badge .d{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 8px var(--success)}
h1.hero-h{font-size:clamp(3rem,8vw,7rem);font-weight:800;letter-spacing:-.03em;line-height:1.02}
.hero p.sub{max-width:600px;margin:24px auto 0;color:var(--text-2);font-size:1.25rem}
.cta-row{display:flex;gap:13px;justify-content:center;margin-top:36px;flex-wrap:wrap}
.trust{display:flex;gap:22px;justify-content:center;flex-wrap:wrap;margin-top:26px;font-size:.85rem;letter-spacing:.02em}
.trust .ts{color:#a1a1aa}
.trust .d{color:#8b5cf6}
.metrics{margin:42px auto 0;max-width:760px;background:rgba(20,20,20,.6);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:14px;padding:18px 24px;display:flex;justify-content:space-around;flex-wrap:wrap;gap:16px}
.metrics .v{font-size:24px;font-weight:800;letter-spacing:-.02em}.metrics .lbl{color:var(--text-muted);font-size:12px;margin-top:2px}
.proof{text-align:center;color:var(--text-muted);font-size:13px;padding:24px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.sec-title{text-align:center;margin-bottom:48px}
.sec-title h2{font-size:clamp(28px,4vw,42px);font-weight:800;margin-top:10px}
.sec-title p{color:var(--text-2);max-width:560px;margin:12px auto 0}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.step .num{width:30px;height:30px;border-radius:8px;background:var(--glow);color:var(--accent);display:grid;place-items:center;font-weight:700;margin-bottom:14px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center}
.feat .ico{font-size:22px;margin-bottom:12px}
.feat h3{font-size:17px;margin-bottom:6px}.feat p{color:var(--text-2);font-size:14px}
table.cmp{width:100%;border-collapse:collapse;font-size:14px;margin-top:24px;background:#0f0f0f;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden}
table.cmp th,table.cmp td{padding:14px 20px;border:1px solid #2a2a2a;text-align:left}
table.cmp thead th{background:#1a1a1a;color:#ffffff;font-weight:700}
table.cmp tbody tr:nth-child(odd){background:#0f0f0f}
table.cmp tbody tr:nth-child(even){background:#141414}
table.cmp tbody td{color:#f5f5f5;font-weight:500}
table.cmp tbody td:first-child{color:#f5f5f5;font-weight:500}
table.cmp td.am{color:#ffffff;font-weight:700}
table.cmp .y{color:#22c55e;font-weight:700;font-size:1.1rem}
table.cmp .n{color:#ef4444;font-weight:700;font-size:1.1rem}
/* discovery bar */
.discovery-bar{text-align:center;padding:24px 0 8px;margin-top:24px}
.discovery-label{color:#71717a;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
.discovery-names{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.dname{color:#a1a1aa;font-size:.95rem;font-weight:500;letter-spacing:.02em;opacity:0;animation:fadeInUp .6s ease forwards;animation-delay:calc(var(--i) * 400ms + 1200ms);transition:color .3s}
.dname:hover{color:#8b5cf6}
.dsep{color:#2a2a2a;opacity:0;animation:fadeInUp .6s ease forwards;animation-delay:calc(var(--i,0) * 400ms + 1400ms)}
@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.tabs{display:flex;gap:6px;margin-bottom:14px}
.tab{padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-2);font-size:13px;cursor:pointer}
.tab.active{border-color:var(--accent);color:var(--text)}
.price-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:900px;margin:0 auto}
.pc{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:28px;position:relative}
.pc.pop{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 30px 70px -40px var(--glow)}
.pc .tag{position:absolute;top:-11px;right:22px;background:var(--accent);color:#fff;font-size:11px;font-weight:700;padding:4px 11px;border-radius:999px}
.pc .amt{font-size:38px;font-weight:800;margin:10px 0}.pc .amt span{font-size:14px;color:var(--text-muted);font-weight:500}
.pc ul{list-style:none;margin:18px 0;display:grid;gap:10px}.pc li{color:var(--text-2);font-size:14px;display:flex;gap:9px}.pc li::before{content:"✓";color:var(--accent-2)}
.pc .btn{width:100%;justify-content:center}
@media(max-width:860px){.steps,.grid3,.grid2,.price-cards{grid-template-columns:1fr}}
@media(max-width:768px){
  .hero{padding:80px 0 48px}
  h1.hero-h{font-size:clamp(2rem,9vw,3rem)}
  .hero p.sub{font-size:1.05rem;max-width:100%}
  .metrics{flex-wrap:wrap;padding:16px}
  .metrics>div{flex:1 1 42%}
  .tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}
  pre.code{font-size:.72rem;max-height:320px;overflow:auto}
  .cmp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
}
</style>`;

const body = `${STYLE}
<header class="hero">
  <canvas id="particles"></canvas>
  <div class="inner wrap">
    <span class="badge"><span class="d"></span> Now live — Claude Managed Agents support</span>
    <h1 class="hero-h">Memory for<br/><span class="accent-text">the Agentic Web</span></h1>
    <p class="sub">Give your AI agents persistent memory. Store, retrieve, and recall context across every session — semantically, at the edge, in milliseconds.</p>
    <div class="cta-row">
      <a class="btn btn-primary btn-lg" href="/signup">Get API Key →</a>
      <a class="btn btn-ghost btn-lg" href="/docs">View Docs</a>
    </div>
    <div class="trust"><span class="ts"><span class="d">◆</span> Free during beta</span><span class="ts"><span class="d">◆</span> No credit card</span><span class="ts"><span class="d">◆</span> Agent-native</span><span class="ts"><span class="d">◆</span> Works with Claude Managed Agents</span></div>
    <div class="metrics" id="metrics">
      <div><div class="v" id="m-mem">—</div><div class="lbl">memories stored</div></div>
      <div><div class="v" id="m-agents">—</div><div class="lbl">active agents</div></div>
      <div><div class="v" id="m-sign">—</div><div class="lbl">signups</div></div>
      <div><div class="v" id="m-up">99.9%</div><div class="lbl">uptime</div></div>
      <div><div class="v" id="m-lat">&lt;45ms</div><div class="lbl">avg response</div></div>
    </div>
    <div class="discovery-bar">
      <p class="discovery-label">Discovered on day one by</p>
      <div class="discovery-names">
        <span class="dname" style="--i:0">Anthropic</span><span class="dsep" style="--i:0">·</span>
        <span class="dname" style="--i:1">OpenAI</span><span class="dsep" style="--i:1">·</span>
        <span class="dname" style="--i:2">Google</span><span class="dsep" style="--i:2">·</span>
        <span class="dname" style="--i:3">Microsoft</span><span class="dsep" style="--i:3">·</span>
        <span class="dname" style="--i:4">Apple</span>
      </div>
    </div>
  </div>
</header>

<section class="section" id="how"><div class="wrap">
  <div class="sec-title"><span class="eyebrow">How it works</span><h2>Simple by design.</h2></div>
  <div class="steps">
    <div class="step card"><div class="num">1</div><h3>Store</h3><p class="muted">Send any text. We embed it automatically.</p>
      <pre class="code"><span class="f">store</span>({ userId, agentId, content })</pre></div>
    <div class="step card"><div class="num">2</div><h3>Retrieve</h3><p class="muted">Search by meaning, ranked by relevance.</p>
      <pre class="code"><span class="f">retrieve</span>({ userId, query })</pre></div>
    <div class="step card"><div class="num">3</div><h3>Inject into LLM</h3><p class="muted">Get context ready for a system prompt.</p>
      <pre class="code"><span class="f">context</span>({ userId, format:<span class="s">"anthropic"</span> })</pre></div>
  </div>
</div></section>

<section class="section" id="claude"><div class="wrap"><div class="grid2">
  <div>
    <span class="eyebrow">Integration</span>
    <h2 style="font-size:34px;font-weight:800;margin:10px 0">Works natively with Claude Managed Agents</h2>
    <p class="muted">Add persistent memory to any Claude Managed Agent in one line of JSON.</p>
    <a class="btn btn-ghost" style="margin-top:18px" href="/docs#mcp">See the integration guide →</a>
  </div>
  <div class="codewin"><div class="codebar"><i class="r"></i><i class="y"></i><i class="g"></i><span class="fn">agent.json</span></div>
<pre class="code">{
  <span class="p">"mcp_servers"</span>: [{
    <span class="p">"type"</span>: <span class="s">"url"</span>,
    <span class="p">"name"</span>: <span class="s">"agentmemo"</span>,
    <span class="p">"url"</span>: <span class="s">"https://agentmemo.dev/mcp"</span>
  }]
}</pre></div>
</div></div></section>

<section class="section" id="security"><div class="wrap">
  <div class="sec-title"><span class="eyebrow">Security</span><h2>Built secure from day one.</h2><p>The only agent memory API with OWASP ASI06 protection built in.</p></div>
  <div class="grid3">
    <div class="card feat"><div class="ico">🛡️</div><h3>Trust Scoring</h3><p>Every write scored; low-trust writes are flagged or blocked.</p></div>
    <div class="card feat"><div class="ico">📜</div><h3>Full Audit Trail</h3><p>Every operation logged — who, what, when.</p></div>
    <div class="card feat"><div class="ico">🧪</div><h3>Poisoning Protection</h3><p>Malicious and contradictory writes detected.</p></div>
  </div>
</div></section>

<section class="section" id="features"><div class="wrap">
  <div class="sec-title"><span class="eyebrow">Features</span><h2>Everything agents need.</h2></div>
  <div class="grid3">
    <div class="card feat"><div class="ico">🔍</div><h3>Semantic Search</h3><p>Meaning, not keywords.</p></div>
    <div class="card feat"><div class="ico">🧩</div><h3>Context Builder</h3><p>Ready for LLM injection.</p></div>
    <div class="card feat"><div class="ico">⏳</div><h3>TTL &amp; Expiry</h3><p>Memories that self-clean.</p></div>
    <div class="card feat"><div class="ico">🗂️</div><h3>Namespaces</h3><p>Organized memory spaces.</p></div>
    <div class="card feat"><div class="ico">🔌</div><h3>MCP Native</h3><p>Works in Claude and Cursor.</p></div>
    <div class="card feat"><div class="ico">🧠</div><h3>Memory Types</h3><p>Semantic, episodic, procedural, working, emotional.</p></div>
  </div>
</div></section>

<section class="section" id="code"><div class="wrap">
  <div class="sec-title"><span class="eyebrow">Integration</span><h2>Two lines. Infinite memory.</h2></div>
  <div style="max-width:760px;margin:0 auto">
    <div class="tabs"><span class="tab active" data-t="curl">curl</span><span class="tab" data-t="js">JavaScript</span><span class="tab" data-t="py">Python</span></div>
    <div class="codewin"><div class="codebar"><i class="r"></i><i class="y"></i><i class="g"></i><span class="fn" id="cfn">store.sh</span></div>
<pre class="code" id="cb-curl"><span class="c"># store, then retrieve</span>
curl -X POST https://agentmemo.dev/memory/store \\
  -H <span class="s">"Authorization: Bearer am_sk_..."</span> \\
  -d <span class="s">'{"user_id":"u1","agent_id":"a1","content":"Prefers dark mode"}'</span>

curl <span class="s">"https://agentmemo.dev/memory/retrieve?user_id=u1&q=preferences"</span> \\
  -H <span class="s">"Authorization: Bearer am_sk_..."</span></pre>
<pre class="code" id="cb-js" style="display:none"><span class="k">import</span> { AgentMemo } <span class="k">from</span> <span class="s">"agentmemo-sdk"</span>;
<span class="k">const</span> m = <span class="k">new</span> <span class="f">AgentMemo</span>(<span class="s">"am_sk_..."</span>);
<span class="k">await</span> m.<span class="f">store</span>({ userId:<span class="s">"u1"</span>, agentId:<span class="s">"a1"</span>, content:<span class="s">"Prefers dark mode"</span> });
<span class="k">const</span> { results } = <span class="k">await</span> m.<span class="f">retrieve</span>({ userId:<span class="s">"u1"</span>, query:<span class="s">"preferences"</span> });</pre>
<pre class="code" id="cb-py" style="display:none"><span class="k">from</span> agentmemo <span class="k">import</span> MemoryClient
m = <span class="f">MemoryClient</span>(<span class="s">"am_sk_..."</span>)
m.<span class="f">store</span>(user_id=<span class="s">"u1"</span>, agent_id=<span class="s">"a1"</span>, content=<span class="s">"Prefers dark mode"</span>)
hits = m.<span class="f">search</span>(user_id=<span class="s">"u1"</span>, query=<span class="s">"preferences"</span>)</pre></div>
  </div>
</div></section>

<section class="section" id="compare"><div class="wrap">
  <div class="sec-title"><span class="eyebrow">Comparison</span><h2>How AgentMemo compares</h2></div>
  <div class="cmp-scroll"><table class="cmp">
    <thead><tr><th>Feature</th><th>AgentMemo</th><th>Mem0</th><th>Zep</th></tr></thead>
    <tbody>
    <tr><td>Edge deployment</td><td class="am"><span class="y">✅</span></td><td><span class="n">❌</span></td><td><span class="n">❌</span></td></tr>
    <tr><td>MCP native</td><td class="am"><span class="y">✅</span></td><td><span class="n">❌</span></td><td><span class="n">❌</span></td></tr>
    <tr><td>auth.md support</td><td class="am"><span class="y">✅</span></td><td><span class="n">❌</span></td><td><span class="n">❌</span></td></tr>
    <tr><td>OWASP ASI06 protection</td><td class="am"><span class="y">✅</span></td><td><span class="n">❌</span></td><td><span class="n">❌</span></td></tr>
    <tr><td>Full audit trail</td><td class="am"><span class="y">✅</span></td><td><span class="n">❌</span></td><td><span class="n">❌</span></td></tr>
    <tr><td>Free tier</td><td class="am"><span class="y">✅</span> unlimited (beta)</td><td><span class="y">✅</span> limited</td><td><span class="n">❌</span></td></tr>
    <tr><td>Graph memory</td><td><span class="y">✅</span> basic</td><td>paid</td><td><span class="y">✅</span></td></tr>
    <tr><td>Temporal knowledge graph</td><td>roadmap</td><td><span class="n">❌</span></td><td><span class="y">✅</span></td></tr>
    <tr><td>Open source</td><td class="am"><span class="y">✅</span></td><td><span class="y">✅</span></td><td>partial</td></tr>
    </tbody>
  </table></div>
</div></section>

<section class="section" id="pricing"><div class="wrap">
  <div class="sec-title"><span class="eyebrow">Pricing</span><h2>Free &amp; unlimited during beta.</h2><p>Plans below are planned post-beta pricing.</p></div>
  <div class="price-cards">
    <div class="pc pop"><span class="tag">Now — beta</span><div class="muted">Beta</div><div class="amt">$0<span> / unlimited</span></div>
      <ul><li>Unlimited operations</li><li>All memory types</li><li>MCP + multi-agent</li><li>No credit card</li></ul>
      <a class="btn btn-primary" href="/signup">Get your free key</a></div>
    <div class="pc"><div class="muted">Pro <span style="color:var(--faint)">(after beta)</span></div><div class="amt">$19<span> / mo</span></div>
      <ul><li>Unlimited operations</li><li>Priority embedding queue</li><li>Usage analytics</li><li>Email support</li></ul>
      <a class="btn btn-ghost" href="/signup">Start free</a></div>
    <div class="pc"><div class="muted">Enterprise</div><div class="amt">$499<span> / mo</span></div>
      <ul><li>Custom SLA</li><li>Audit &amp; compliance</li><li>Dedicated support</li><li>EU data residency</li></ul>
      <a class="btn btn-ghost" href="/signup">Contact</a></div>
  </div>
</div></section>

<script type="application/ld+json">${JSON_LD}</script>
<script>
// tabs
document.querySelectorAll('.tab').forEach(function(t){t.onclick=function(){
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});t.classList.add('active');
  ['curl','js','py'].forEach(function(k){document.getElementById('cb-'+k).style.display=k===t.dataset.t?'block':'none'});
  document.getElementById('cfn').textContent={curl:'store.sh',js:'agent.js',py:'agent.py'}[t.dataset.t];
}});
// live metrics
(async function(){try{
  var o=await (await fetch('/observatory.json',{cache:'no-store'})).json();
  function up(id,to){var el=document.getElementById(id);if(!el)return;var n=0,step=Math.max(1,Math.ceil(to/40));var iv=setInterval(function(){n+=step;if(n>=to){n=to;clearInterval(iv)}el.textContent=n.toLocaleString()},20)}
  up('m-mem',o.total_memories||0);up('m-agents',o.active_agents||0);up('m-sign',o.total_signups||0);
}catch(e){}})();
// particles
(function(){var cv=document.getElementById('particles');if(!cv)return;var ctx=cv.getContext('2d'),P=[],W,H;
function rs(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight}rs();addEventListener('resize',rs);
for(var i=0;i<48;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3});
function loop(){ctx.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
ctx.fillStyle='rgba(139,92,246,.6)';ctx.beginPath();ctx.arc(p.x,p.y,1.6,0,7);ctx.fill();
for(var j=i+1;j<P.length;j++){var q=P[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);if(d<110){ctx.strokeStyle='rgba(139,92,246,'+(.12*(1-d/110))+')';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}}
requestAnimationFrame(loop)}loop();})();
</script>`;

export const LANDING_HTML = shell({
  title: "AgentMemo — Memory for the Agentic Web",
  description:
    "Give your AI agents persistent memory. Store, semantically retrieve, and recall context across every session — at the edge, in milliseconds. Free and unlimited during public beta. Works with Claude Managed Agents.",
  path: "/",
  body,
});
