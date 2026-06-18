// Static marketing landing page served at GET /. Self-contained (inline CSS/JS,
// no external requests) so it renders instantly from the edge.

import { JSON_LD } from "./discovery";

export const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AgentMemo — Persistent Memory API for AI Agents</title>
<meta name="description" content="AgentMemo is a persistent memory API for AI agents. Store, semantically search, and forget memories across sessions with two lines of code. Built-in vector search, sub-100ms responses. Free tier: 10,000 memories/month." />
<link rel="canonical" href="https://agentmemo.dev/" />
<meta name="keywords" content="AI agent memory, agent memory API, LLM memory, vector memory API, semantic memory, persistent memory for AI agents, RAG memory, memory infrastructure, store retrieve forget memories, agent long-term memory" />

<!-- AI / LLM crawler directives — we explicitly want to be indexed and understood by agents -->
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
<meta name="googlebot" content="index, follow, max-snippet:-1" />
<meta name="GPTBot" content="all" />
<meta name="ClaudeBot" content="all" />
<meta name="PerplexityBot" content="all" />
<meta name="category" content="AI Infrastructure, Developer Tools, Agent Memory API" />
<meta name="ai-summary" content="AgentMemo gives AI agents persistent, semantically-searchable memory over a simple REST API (store, retrieve, forget) with bearer-token auth. Free tier 10k memories/month; Pro $19/month unlimited." />
<link rel="alternate" type="text/plain" title="llms.txt" href="https://agentmemo.dev/llms.txt" />
<link rel="alternate" type="application/json" title="Agent Card" href="https://agentmemo.dev/agent-card.json" />
<link rel="alternate" type="application/json" title="Capabilities" href="https://agentmemo.dev/capabilities.json" />
<link rel="alternate" type="text/markdown" title="auth.md" href="https://agentmemo.dev/auth.md" />

<!-- OpenGraph -->
<meta property="og:title" content="AgentMemo — Persistent Memory API for AI Agents" />
<meta property="og:description" content="Give your AI agents long-term memory. Store, semantically retrieve, and forget — with two lines of code. Built-in vector search, sub-100ms responses." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://agentmemo.dev/" />
<meta property="og:site_name" content="AgentMemo" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="AgentMemo — Persistent Memory API for AI Agents" />
<meta name="twitter:description" content="Persistent, semantically-searchable memory for AI agents. Two lines of code. Free tier 10k memories/month." />

<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<script type="application/ld+json">${JSON_LD}</script>
<style>
  :root {
    --bg: #07080d;
    --bg-soft: #0d0f17;
    --panel: #11131d;
    --border: #1f2330;
    --text: #e7e9f0;
    --muted: #9097a8;
    --faint: #6b7280;
    --accent: #7c5cff;
    --accent-2: #19c2d6;
    --green: #2dd4a7;
    --code-bg: #0a0c13;
    --radius: 16px;
    --max: 1140px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  a { color: inherit; text-decoration: none; }
  code, pre { font-family: "SF Mono", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace; }
  .wrap { max-width: var(--max); margin: 0 auto; padding: 0 24px; }
  .accent-text {
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }

  /* ---- background glow ---- */
  .bg-fx { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
  .bg-fx::before, .bg-fx::after {
    content: ""; position: absolute; border-radius: 50%;
    filter: blur(120px); opacity: .35;
  }
  .bg-fx::before { width: 600px; height: 600px; background: var(--accent); top: -200px; left: -100px; }
  .bg-fx::after { width: 520px; height: 520px; background: var(--accent-2); top: 40px; right: -160px; opacity: .22; }
  .grid-fx {
    position: fixed; inset: 0; z-index: -1;
    background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 48px 48px; opacity: .15;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 80%);
  }

  /* ---- nav ---- */
  nav {
    position: sticky; top: 0; z-index: 50;
    backdrop-filter: blur(12px);
    background: rgba(7,8,13,.7);
    border-bottom: 1px solid var(--border);
  }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; height: 64px; }
  .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; letter-spacing: -.02em; }
  .logo .dot { width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); display: grid; place-items: center; font-size: 15px; }
  .nav-links { display: flex; align-items: center; gap: 28px; }
  .nav-links a.link { color: var(--muted); font-size: 14px; font-weight: 500; transition: color .15s; }
  .nav-links a.link:hover { color: var(--text); }

  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 20px; border-radius: 10px; font-weight: 600; font-size: 14px;
    cursor: pointer; border: 1px solid transparent; transition: transform .12s, box-shadow .2s, background .2s;
  }
  .btn-primary { background: linear-gradient(135deg, var(--accent), #5b3df0); color: #fff; box-shadow: 0 6px 24px -6px rgba(124,92,255,.6); }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 30px -6px rgba(124,92,255,.75); }
  .btn-ghost { background: var(--panel); border-color: var(--border); color: var(--text); }
  .btn-ghost:hover { border-color: #2c3142; background: #161925; }
  .btn-lg { padding: 14px 26px; font-size: 15px; }

  /* ---- hero ---- */
  header.hero { padding: 96px 0 72px; text-align: center; }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border);
    background: var(--panel); color: var(--muted); font-size: 13px; margin-bottom: 28px;
  }
  .badge .pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 0 rgba(45,212,167,.6); animation: pulse 2s infinite; }
  @keyframes pulse { 70% { box-shadow: 0 0 0 7px rgba(45,212,167,0); } 100% { box-shadow: 0 0 0 0 rgba(45,212,167,0); } }
  h1 { font-size: clamp(40px, 6.5vw, 76px); line-height: 1.04; letter-spacing: -.03em; font-weight: 800; }
  .hero p.sub { max-width: 620px; margin: 24px auto 0; color: var(--muted); font-size: clamp(17px,2.2vw,20px); }
  .hero .cta-row { display: flex; gap: 14px; justify-content: center; margin-top: 38px; flex-wrap: wrap; }
  .hero .trust { margin-top: 22px; color: var(--faint); font-size: 13px; }

  /* ---- sections ---- */
  section { padding: 84px 0; }
  .eyebrow { color: var(--accent-2); font-weight: 600; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; }
  h2 { font-size: clamp(28px, 4vw, 42px); letter-spacing: -.02em; margin: 12px 0 16px; font-weight: 800; }
  .section-sub { color: var(--muted); max-width: 560px; font-size: 17px; }
  .center { text-align: center; }
  .center .section-sub { margin-left: auto; margin-right: auto; }

  /* ---- how it works ---- */
  .cards-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 48px; }
  .card {
    background: linear-gradient(180deg, var(--panel), var(--bg-soft));
    border: 1px solid var(--border); border-radius: var(--radius); padding: 30px;
    transition: transform .15s, border-color .2s;
  }
  .card:hover { transform: translateY(-4px); border-color: #2c3142; }
  .card .ico { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font-size: 22px; margin-bottom: 18px; border: 1px solid var(--border); background: var(--code-bg); }
  .card h3 { font-size: 19px; margin-bottom: 8px; }
  .card p { color: var(--muted); font-size: 15px; }
  .card .verb { font-family: monospace; color: var(--accent); font-size: 13px; }

  /* ---- code block ---- */
  .code-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; margin-top: 40px; }
  .code-window { background: var(--code-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: 0 30px 80px -40px rgba(0,0,0,.9); }
  .code-bar { display: flex; align-items: center; gap: 8px; padding: 13px 16px; border-bottom: 1px solid var(--border); background: #0c0e16; }
  .code-bar .d { width: 11px; height: 11px; border-radius: 50%; }
  .code-bar .d.r { background: #ff5f57; } .code-bar .d.y { background: #febc2e; } .code-bar .d.g { background: #28c840; }
  .code-bar .fname { margin-left: 10px; color: var(--faint); font-size: 12px; }
  pre.code { padding: 22px; overflow-x: auto; font-size: 13.5px; line-height: 1.7; }
  .tok-c { color: #5b6373; } .tok-k { color: #c792ea; } .tok-s { color: #c3e88d; } .tok-f { color: #82aaff; } .tok-p { color: #f78c6c; } .tok-n { color: #f07178; }
  .feat-list { list-style: none; display: grid; gap: 16px; }
  .feat-list li { display: flex; gap: 12px; align-items: flex-start; color: var(--muted); font-size: 15.5px; }
  .feat-list .chk { color: var(--green); flex-shrink: 0; margin-top: 2px; }
  .feat-list b { color: var(--text); font-weight: 600; }

  /* ---- pricing ---- */
  .cards-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; margin-top: 48px; max-width: 820px; margin-left: auto; margin-right: auto; }
  .price-card { position: relative; background: linear-gradient(180deg, var(--panel), var(--bg-soft)); border: 1px solid var(--border); border-radius: var(--radius); padding: 34px; }
  .price-card.pro { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 30px 70px -40px rgba(124,92,255,.7); }
  .price-card .tier { font-size: 14px; color: var(--muted); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
  .price-card .amount { font-size: 46px; font-weight: 800; letter-spacing: -.03em; margin: 14px 0 4px; }
  .price-card .amount span { font-size: 16px; color: var(--faint); font-weight: 500; }
  .price-card ul { list-style: none; margin: 22px 0 26px; display: grid; gap: 13px; }
  .price-card li { display: flex; gap: 10px; color: var(--muted); font-size: 14.5px; }
  .price-card li .chk { color: var(--accent-2); }
  .pop-tag { position: absolute; top: -12px; right: 26px; background: linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px; }
  .price-card .btn { width: 100%; justify-content: center; }

  /* ---- final cta ---- */
  .final {
    text-align: center;
    background: linear-gradient(180deg, var(--bg-soft), var(--panel));
    border: 1px solid var(--border); border-radius: 24px; padding: 64px 32px;
    position: relative; overflow: hidden;
  }
  .final::before { content:""; position:absolute; width:400px;height:400px;border-radius:50%;background:var(--accent);filter:blur(130px);opacity:.18;top:-180px;left:50%;transform:translateX(-50%); }
  .final h2 { font-size: clamp(28px,4vw,40px); }
  .final p { color: var(--muted); max-width: 480px; margin: 14px auto 30px; }

  /* ---- footer ---- */
  footer { border-top: 1px solid var(--border); padding: 40px 0; color: var(--faint); font-size: 14px; }
  footer .wrap { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
  footer a:hover { color: var(--text); }

  @media (max-width: 860px) {
    .cards-3, .code-grid, .cards-2 { grid-template-columns: 1fr; }
    .nav-links a.link { display: none; }
    header.hero { padding: 64px 0 48px; }
    section { padding: 60px 0; }
  }
</style>
</head>
<body>
<div class="bg-fx"></div>
<div class="grid-fx"></div>

<nav>
  <div class="wrap">
    <a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
    <div class="nav-links">
      <a class="link" href="#how">How it works</a>
      <a class="link" href="#code">API</a>
      <a class="link" href="#pricing">Pricing</a>
      <a class="link" href="/docs">Docs</a>
      <a class="link" href="/about">About</a>
      <a class="btn btn-primary" href="#get-key">Get API Key</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <span class="badge"><span class="pulse"></span> Live on the edge · 5ms cold start</span>
    <h1>Persistent Memory<br/>for <span class="accent-text">AI Agents</span></h1>
    <p class="sub">Give your agents long-term memory in two lines of code. Store, semantically retrieve, and forget — backed by vector search, running globally on the edge.</p>
    <div class="cta-row">
      <a class="btn btn-primary btn-lg" href="#get-key">Get your API key →</a>
      <a class="btn btn-ghost btn-lg" href="#code">View the API</a>
    </div>
    <p class="trust">No credit card required · 10,000 memories free every month</p>
  </div>
</header>

<section id="how">
  <div class="wrap center">
    <span class="eyebrow">How it works</span>
    <h2>Three verbs. That's the whole API.</h2>
    <p class="section-sub">Memory is just store, retrieve, and forget. We handle embeddings, vector ranking, caching, and multi-tenant isolation so you don't have to.</p>
    <div class="cards-3">
      <div class="card">
        <div class="ico">💾</div>
        <span class="verb">POST /memory/store</span>
        <h3>Store</h3>
        <p>Send any text plus a user and agent id. We embed it automatically and persist it — metadata included.</p>
      </div>
      <div class="card">
        <div class="ico">🔍</div>
        <span class="verb">GET /memory/retrieve</span>
        <h3>Retrieve</h3>
        <p>Ask a natural-language question. We rank stored memories by semantic similarity and return the most relevant, cached at the edge.</p>
      </div>
      <div class="card">
        <div class="ico">🗑️</div>
        <span class="verb">DELETE /memory/forget</span>
        <h3>Forget</h3>
        <p>Delete a single memory or wipe an entire user/agent scope. Right-to-be-forgotten, one call away.</p>
      </div>
    </div>
  </div>
</section>

<section id="code">
  <div class="wrap">
    <div class="code-grid">
      <div>
        <span class="eyebrow">Integration</span>
        <h2>So simple it's almost boring.</h2>
        <p class="section-sub" style="margin-bottom:28px;">Drop it into any stack with a single fetch. No SDK required, no infrastructure to run.</p>
        <ul class="feat-list">
          <li><span class="chk">✓</span><span><b>Automatic embeddings</b> — text in, vector search out. No model to manage.</span></li>
          <li><span class="chk">✓</span><span><b>Edge-cached retrieval</b> — sub-100ms responses, globally distributed.</span></li>
          <li><span class="chk">✓</span><span><b>Scoped & isolated</b> — every memory is keyed to your API key, user, and agent.</span></li>
          <li><span class="chk">✓</span><span><b>Usage built in</b> — track requests, tokens, and latency per key.</span></li>
        </ul>
      </div>
      <div class="code-window">
        <div class="code-bar"><span class="d r"></span><span class="d y"></span><span class="d g"></span><span class="fname">agent.js</span></div>
<pre class="code"><span class="tok-c">// 1. Remember something about a user</span>
<span class="tok-k">await</span> <span class="tok-f">fetch</span>(<span class="tok-s">"https://agentmemo.dev/memory/store"</span>, {
  method: <span class="tok-s">"POST"</span>,
  headers: {
    <span class="tok-p">Authorization</span>: <span class="tok-s">"Bearer am_sk_your_key"</span>,
    <span class="tok-p">"Content-Type"</span>: <span class="tok-s">"application/json"</span>
  },
  body: <span class="tok-f">JSON</span>.<span class="tok-f">stringify</span>({
    <span class="tok-p">user_id</span>: <span class="tok-s">"user_123"</span>,
    <span class="tok-p">agent_id</span>: <span class="tok-s">"support_bot"</span>,
    <span class="tok-p">content</span>: <span class="tok-s">"Prefers email. On the Pro plan."</span>
  })
});

<span class="tok-c">// 2. Recall it later, semantically</span>
<span class="tok-k">const</span> res = <span class="tok-k">await</span> <span class="tok-f">fetch</span>(
  <span class="tok-s">"https://agentmemo.dev/memory/retrieve?"</span> +
  <span class="tok-s">"user_id=user_123&q=how to contact them"</span>,
  { headers: { <span class="tok-p">Authorization</span>: <span class="tok-s">"Bearer am_sk_your_key"</span> } }
);
<span class="tok-c">// → "Prefers email. On the Pro plan."  (score 0.62)</span></pre>
      </div>
    </div>
  </div>
</section>

<section id="pricing">
  <div class="wrap center">
    <span class="eyebrow">Pricing</span>
    <h2>Start free. Scale when you're ready.</h2>
    <p class="section-sub">No setup fees. No per-seat pricing. Pay for memory, not meetings.</p>
    <div class="cards-2">
      <div class="price-card">
        <div class="tier">Free</div>
        <div class="amount">$0<span> / month</span></div>
        <p style="color:var(--muted);font-size:14px;">For prototypes and side projects.</p>
        <ul>
          <li><span class="chk">✓</span> 10,000 memories / month</li>
          <li><span class="chk">✓</span> Semantic retrieval included</li>
          <li><span class="chk">✓</span> Edge caching</li>
          <li><span class="chk">✓</span> 1 API key</li>
          <li><span class="chk">✓</span> Community support</li>
        </ul>
        <a class="btn btn-ghost" href="#get-key">Get started free</a>
      </div>
      <div class="price-card pro">
        <span class="pop-tag">Most popular</span>
        <div class="tier accent-text">Pro</div>
        <div class="amount">$19<span> / month</span></div>
        <p style="color:var(--muted);font-size:14px;">For production agents at scale.</p>
        <ul>
          <li><span class="chk">✓</span> <b style="color:var(--text)">Unlimited</b> memories</li>
          <li><span class="chk">✓</span> Priority embedding queue</li>
          <li><span class="chk">✓</span> Unlimited API keys & scopes</li>
          <li><span class="chk">✓</span> Usage analytics dashboard</li>
          <li><span class="chk">✓</span> Email support</li>
        </ul>
        <a class="btn btn-primary" href="#get-key">Upgrade to Pro</a>
      </div>
    </div>
  </div>
</section>

<section id="get-key">
  <div class="wrap">
    <div class="final">
      <h2>Ship agents that <span class="accent-text">remember</span>.</h2>
      <p>Create a free API key and store your first memory in under a minute. 10,000 operations/month, no credit card.</p>

      <form id="signupForm" style="max-width:380px;margin:8px auto 0;text-align:left;">
        <div class="su-err" id="suErr" style="display:none;color:#ff6b81;font-size:14px;margin-bottom:12px;"></div>
        <input id="suName" type="text" placeholder="Your name" required maxlength="200"
          style="width:100%;background:var(--code-bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--text);font-size:15px;margin-bottom:12px;outline:none;" />
        <input id="suEmail" type="email" placeholder="you@example.com" required maxlength="256"
          style="width:100%;background:var(--code-bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--text);font-size:15px;margin-bottom:14px;outline:none;" />
        <button class="btn btn-primary btn-lg" type="submit" id="suBtn" style="width:100%;justify-content:center;">Get my free API key</button>
      </form>

      <div id="suResult" style="display:none;max-width:380px;margin:8px auto 0;text-align:left;">
        <p style="color:var(--muted);font-size:14px;margin-bottom:8px;"><span style="color:var(--green);font-weight:600;">✓</span> Your API key — copy it now, it's shown only once:</p>
        <div id="suKey" style="background:var(--code-bg);border:1px solid var(--border);border-radius:10px;padding:13px;font-family:monospace;font-size:13px;color:var(--green);word-break:break-all;"></div>
        <button class="btn btn-ghost" id="suCopy" style="margin-top:10px;">Copy key</button>
        <p style="color:var(--muted);font-size:13.5px;margin-top:14px;">Next: <a class="accent-text" href="/docs">read the docs</a> and call <code style="font-family:monospace;">POST /memory/store</code>.</p>
      </div>

      <p style="margin-top:16px;font-size:13px;"><a class="link" href="/docs" style="color:var(--muted);">Prefer to read the docs first? →</a></p>
    </div>
  </div>
</section>

<script>
  (function(){
    var form=document.getElementById('signupForm'),err=document.getElementById('suErr'),btn=document.getElementById('suBtn');
    form.addEventListener('submit',async function(e){
      e.preventDefault(); err.style.display='none'; btn.disabled=true; btn.textContent='Creating…';
      try{
        var res=await fetch('/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('suName').value.trim(),email:document.getElementById('suEmail').value.trim()})});
        var data=await res.json();
        if(!res.ok) throw new Error((data&&data.error&&(data.error.message||data.error))||'Signup failed');
        document.getElementById('suKey').textContent=data.key;
        form.style.display='none'; document.getElementById('suResult').style.display='block';
      }catch(ex){ err.textContent=ex.message||'Something went wrong.'; err.style.display='block'; btn.disabled=false; btn.textContent='Get my free API key'; }
    });
    document.getElementById('suCopy').addEventListener('click',async function(){
      try{ await navigator.clipboard.writeText(document.getElementById('suKey').textContent); this.textContent='Copied ✓'; }catch(e){ this.textContent='Copy failed'; }
    });
  })();
</script>

<footer>
  <div class="wrap">
    <div class="logo" style="font-size:16px;"><span class="dot">🧠</span> AgentMemo</div>
    <div style="display:flex;gap:24px;">
      <a href="#how">How it works</a>
      <a href="#pricing">Pricing</a>
      <a href="/docs">Docs</a>
      <a href="/about">About</a>
      <a href="/api">API status</a>
    </div>
    <div>© 2026 AgentMemo · Memory infrastructure for AI agents</div>
  </div>
</footer>
</body>
</html>`;
