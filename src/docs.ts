// Static API documentation page served at GET /docs. Self-contained, dark
// theme matching the landing page, no external requests.

export const DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>API Docs — AgentMemo</title>
<meta name="description" content="AgentMemo API reference: authenticate, store, retrieve, and forget agent memories with code examples." />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root {
    --bg:#07080d; --bg-soft:#0d0f17; --panel:#11131d; --border:#1f2330;
    --text:#e7e9f0; --muted:#9097a8; --faint:#6b7280;
    --accent:#7c5cff; --accent-2:#19c2d6; --green:#2dd4a7; --orange:#f78c6c; --red:#ff6b81;
    --code-bg:#0a0c13; --radius:14px;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.65; -webkit-font-smoothing:antialiased; }
  a { color:var(--accent-2); text-decoration:none; }
  a:hover { text-decoration:underline; }
  code { font-family:"SF Mono","JetBrains Mono","Fira Code",Menlo,Consolas,monospace; }
  .accent-text { background:linear-gradient(90deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent; }

  /* nav */
  nav { position:sticky; top:0; z-index:50; backdrop-filter:blur(12px); background:rgba(7,8,13,.8); border-bottom:1px solid var(--border); }
  nav .inner { max-width:1180px; margin:0 auto; padding:0 24px; height:60px; display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:10px; font-weight:700; font-size:17px; color:var(--text); }
  .logo .dot { width:25px; height:25px; border-radius:7px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:grid; place-items:center; font-size:14px; }
  nav .right { display:flex; gap:22px; align-items:center; font-size:14px; }
  nav .right a { color:var(--muted); }
  nav .right a:hover { color:var(--text); text-decoration:none; }

  /* layout */
  .layout { max-width:1180px; margin:0 auto; padding:0 24px; display:grid; grid-template-columns:230px 1fr; gap:48px; }
  aside { position:sticky; top:60px; align-self:start; height:calc(100vh - 60px); overflow-y:auto; padding:36px 0; }
  aside .group { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--faint); margin:20px 0 10px; font-weight:600; }
  aside a { display:block; color:var(--muted); font-size:14px; padding:6px 0; }
  aside a:hover { color:var(--text); text-decoration:none; }
  main { padding:48px 0 120px; min-width:0; max-width:760px; }

  h1 { font-size:40px; letter-spacing:-.02em; font-weight:800; }
  .lede { color:var(--muted); font-size:18px; margin:14px 0 8px; }
  h2 { font-size:26px; margin:56px 0 14px; letter-spacing:-.01em; scroll-margin-top:80px; padding-top:8px; }
  h3 { font-size:17px; margin:28px 0 10px; }
  p { color:var(--muted); margin:12px 0; }
  p strong, li strong { color:var(--text); font-weight:600; }
  ul { color:var(--muted); margin:12px 0 12px 22px; }
  li { margin:6px 0; }
  hr { border:none; border-top:1px solid var(--border); margin:8px 0; }

  /* endpoint heading */
  .endpoint { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:54px 0 6px; scroll-margin-top:80px; }
  .method { font-family:monospace; font-size:12px; font-weight:700; padding:4px 10px; border-radius:7px; letter-spacing:.03em; }
  .m-post { background:rgba(45,212,167,.15); color:var(--green); border:1px solid rgba(45,212,167,.35); }
  .m-get { background:rgba(25,194,214,.15); color:var(--accent-2); border:1px solid rgba(25,194,214,.35); }
  .m-del { background:rgba(255,107,129,.13); color:var(--red); border:1px solid rgba(255,107,129,.35); }
  .path { font-family:monospace; font-size:18px; color:var(--text); font-weight:600; }

  /* code */
  .code-window { background:var(--code-bg); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; margin:16px 0; }
  .code-bar { display:flex; align-items:center; padding:9px 14px; border-bottom:1px solid var(--border); background:#0c0e16; gap:8px; }
  .code-bar .lbl { color:var(--faint); font-size:12px; font-family:monospace; }
  pre { padding:18px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd3e0; }
  pre code { color:inherit; }
  .tok-c{color:#5b6373;} .tok-k{color:#c792ea;} .tok-s{color:#c3e88d;} .tok-f{color:#82aaff;} .tok-p{color:#f78c6c;} .tok-m{color:#19c2d6;}
  p code, li code, td code { background:#161925; border:1px solid var(--border); border-radius:5px; padding:1px 6px; font-size:12.5px; color:#e7e9f0; }

  /* table */
  table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:top; }
  th { color:var(--faint); font-size:12px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
  td { color:var(--muted); }
  td:first-child code { color:var(--orange); }
  .req { color:var(--red); font-size:11px; font-weight:600; }
  .opt { color:var(--faint); font-size:11px; }

  .note { border-left:3px solid var(--accent); background:var(--panel); border-radius:0 10px 10px 0; padding:14px 18px; margin:18px 0; font-size:14px; }
  .note strong { color:var(--text); }

  footer { border-top:1px solid var(--border); margin-top:60px; padding:30px 0; color:var(--faint); font-size:13px; text-align:center; }

  @media (max-width:880px) {
    .layout { grid-template-columns:1fr; gap:0; }
    aside { display:none; }
    main { padding:36px 0 80px; }
    nav .right a.hide { display:none; }
  }
</style>
</head>
<body>
<nav>
  <div class="inner">
    <a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
    <div class="right">
      <a href="/#how" class="hide">How it works</a>
      <a href="/#pricing" class="hide">Pricing</a>
      <a href="/docs">Docs</a>
      <a href="https://github.com/skullbase-ecom/agentmemo">GitHub</a>
    </div>
  </div>
</nav>

<div class="layout">
  <aside>
    <div class="group">Getting started</div>
    <a href="#intro">Introduction</a>
    <a href="#base-url">Base URL</a>
    <a href="#auth">Authentication</a>
    <a href="#errors">Errors</a>
    <div class="group">Memory API</div>
    <a href="#store">Store a memory</a>
    <a href="#retrieve">Retrieve memories</a>
    <a href="#forget">Forget memories</a>
    <div class="group">Account</div>
    <a href="#usage">Usage</a>
  </aside>

  <main>
    <h1>API <span class="accent-text">Reference</span></h1>
    <p class="lede">AgentMemo gives your AI agents persistent, semantically-searchable memory over a tiny REST API. Three verbs &mdash; store, retrieve, forget &mdash; plus authentication and usage.</p>

    <h2 id="intro">Introduction</h2>
    <p>Every request is JSON over HTTPS. All memory is scoped to your API key, so data from different keys is fully isolated. Embeddings and vector ranking are handled for you &mdash; you send plain text, we make it searchable.</p>

    <h2 id="base-url">Base URL</h2>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">base url</span></div>
<pre><code><span class="tok-m">https://agentmemo.dev</span></code></pre>
    </div>

    <h2 id="auth">Authentication</h2>
    <p>Authenticate every request with your secret API key in the <code>Authorization</code> header as a bearer token. Keys look like <code>am_sk_...</code> and are shown only once when created.</p>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">Authorization header</span></div>
<pre><code><span class="tok-p">Authorization</span>: <span class="tok-k">Bearer</span> <span class="tok-s">am_sk_your_secret_key</span></code></pre>
    </div>
    <p>Keys carry scopes: <code>read</code> (retrieve, usage) and <code>write</code> (store, forget). Don't have a key yet? <a href="/#get-key">Request one here</a>.</p>
    <div class="note"><strong>Keep keys secret.</strong> Treat <code>am_sk_</code> keys like passwords &mdash; use them only from server-side code, never in a browser or mobile client.</div>

    <h2 id="errors">Errors</h2>
    <p>Errors return the matching HTTP status and a JSON body of the form <code>{ "error": { "status", "message" } }</code>.</p>
    <table>
      <tr><th>Status</th><th>Meaning</th></tr>
      <tr><td><code>400</code></td><td>Invalid request &mdash; missing or malformed fields.</td></tr>
      <tr><td><code>401</code></td><td>Missing or invalid API key.</td></tr>
      <tr><td><code>403</code></td><td>Key is revoked or lacks the required scope.</td></tr>
      <tr><td><code>404</code></td><td>Resource (e.g. a memory id) not found.</td></tr>
    </table>

    <!-- STORE -->
    <div class="endpoint" id="store">
      <span class="method m-post">POST</span><span class="path">/memory/store</span>
    </div>
    <p>Store a memory. The <code>content</code> is embedded automatically so it becomes semantically retrievable. Requires the <code>write</code> scope.</p>
    <h3>Body parameters</h3>
    <table>
      <tr><th>Field</th><th>Type</th><th>Description</th></tr>
      <tr><td><code>user_id</code> <span class="req">required</span></td><td>string</td><td>End-user this memory belongs to.</td></tr>
      <tr><td><code>agent_id</code> <span class="req">required</span></td><td>string</td><td>Agent that produced or owns the memory.</td></tr>
      <tr><td><code>content</code> <span class="req">required</span></td><td>string</td><td>The memory text. Up to 100,000 chars.</td></tr>
      <tr><td><code>metadata</code> <span class="opt">optional</span></td><td>object</td><td>Arbitrary JSON returned with the memory.</td></tr>
    </table>
    <h3>Example request</h3>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X POST <span class="tok-m">https://agentmemo.dev/memory/store</span> \\
  -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span> \\
  -H <span class="tok-s">"Content-Type: application/json"</span> \\
  -d <span class="tok-s">'{
    "user_id": "user_123",
    "agent_id": "support_bot",
    "content": "The customer prefers email and is on the Pro plan.",
    "metadata": { "channel": "email", "plan": "pro" }
  }'</span></code></pre>
    </div>
    <h3>Example response <span style="color:var(--green);font-size:13px;">201 Created</span></h3>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">200 OK · application/json</span></div>
<pre><code>{
  <span class="tok-p">"id"</span>: <span class="tok-s">"mem_52fd593fd8b74f6db96a"</span>,
  <span class="tok-p">"user_id"</span>: <span class="tok-s">"user_123"</span>,
  <span class="tok-p">"agent_id"</span>: <span class="tok-s">"support_bot"</span>,
  <span class="tok-p">"content"</span>: <span class="tok-s">"The customer prefers email and is on the Pro plan."</span>,
  <span class="tok-p">"metadata"</span>: { <span class="tok-p">"channel"</span>: <span class="tok-s">"email"</span>, <span class="tok-p">"plan"</span>: <span class="tok-s">"pro"</span> },
  <span class="tok-p">"embedded"</span>: <span class="tok-k">true</span>,
  <span class="tok-p">"created_at"</span>: <span class="tok-m">1781729785946</span>
}</code></pre>
    </div>

    <!-- RETRIEVE -->
    <div class="endpoint" id="retrieve">
      <span class="method m-get">GET</span><span class="path">/memory/retrieve</span>
    </div>
    <p>Semantically search a user's memories. The query is embedded and memories are ranked by cosine similarity; results are edge-cached. Requires the <code>read</code> scope.</p>
    <h3>Query parameters</h3>
    <table>
      <tr><th>Param</th><th>Type</th><th>Description</th></tr>
      <tr><td><code>q</code> <span class="req">required</span></td><td>string</td><td>Natural-language search query.</td></tr>
      <tr><td><code>user_id</code> <span class="req">required</span></td><td>string</td><td>Scope the search to this user.</td></tr>
      <tr><td><code>agent_id</code> <span class="opt">optional</span></td><td>string</td><td>Further narrow to one agent.</td></tr>
      <tr><td><code>limit</code> <span class="opt">optional</span></td><td>int</td><td>Max results (default 10, max 100).</td></tr>
      <tr><td><code>min_score</code> <span class="opt">optional</span></td><td>float</td><td>Drop results below this similarity.</td></tr>
    </table>
    <h3>Example request</h3>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> <span class="tok-s">"https://agentmemo.dev/memory/retrieve?user_id=user_123&q=how+to+contact+them&limit=3"</span> \\
  -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span></code></pre>
    </div>
    <h3>JavaScript</h3>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">fetch</span></div>
<pre><code><span class="tok-k">const</span> params = <span class="tok-k">new</span> <span class="tok-f">URLSearchParams</span>({
  <span class="tok-p">user_id</span>: <span class="tok-s">"user_123"</span>,
  <span class="tok-p">q</span>: <span class="tok-s">"how should we contact this user"</span>
});
<span class="tok-k">const</span> res = <span class="tok-k">await</span> <span class="tok-f">fetch</span>(<span class="tok-s">"https://agentmemo.dev/memory/retrieve?"</span> + params, {
  <span class="tok-p">headers</span>: { <span class="tok-p">Authorization</span>: <span class="tok-s">"Bearer am_sk_your_key"</span> }
});
<span class="tok-k">const</span> { results } = <span class="tok-k">await</span> res.<span class="tok-f">json</span>();</code></pre>
    </div>
    <h3>Example response <span style="color:var(--accent-2);font-size:13px;">200 OK</span></h3>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">200 OK · application/json</span></div>
<pre><code>{
  <span class="tok-p">"query"</span>: <span class="tok-s">"how should we contact this user"</span>,
  <span class="tok-p">"semantic"</span>: <span class="tok-k">true</span>,
  <span class="tok-p">"count"</span>: <span class="tok-m">1</span>,
  <span class="tok-p">"results"</span>: [
    {
      <span class="tok-p">"id"</span>: <span class="tok-s">"mem_52fd593fd8b74f6db96a"</span>,
      <span class="tok-p">"content"</span>: <span class="tok-s">"The customer prefers email and is on the Pro plan."</span>,
      <span class="tok-p">"metadata"</span>: { <span class="tok-p">"channel"</span>: <span class="tok-s">"email"</span> },
      <span class="tok-p">"score"</span>: <span class="tok-m">0.617785</span>,
      <span class="tok-p">"created_at"</span>: <span class="tok-m">1781729785946</span>
    }
  ]
}</code></pre>
    </div>
    <div class="note"><strong>Recency fallback.</strong> If the embedding service is briefly unavailable, retrieval returns the most recent memories with <code>"semantic": false</code> and <code>score: null</code> instead of failing.</div>

    <!-- FORGET -->
    <div class="endpoint" id="forget">
      <span class="method m-del">DELETE</span><span class="path">/memory/forget</span>
    </div>
    <p>Delete a single memory by <code>id</code>, or wipe an entire scope by <code>user_id</code> (optionally narrowed by <code>agent_id</code>). Deletes are always restricted to your own key. Requires the <code>write</code> scope.</p>
    <h3>Query parameters</h3>
    <table>
      <tr><th>Param</th><th>Type</th><th>Description</th></tr>
      <tr><td><code>id</code></td><td>string</td><td>Delete one specific memory. Returns <code>404</code> if not found.</td></tr>
      <tr><td><code>user_id</code></td><td>string</td><td>Delete all of a user's memories.</td></tr>
      <tr><td><code>agent_id</code> <span class="opt">optional</span></td><td>string</td><td>With <code>user_id</code>, limit deletion to one agent.</td></tr>
    </table>
    <p>Provide either <code>id</code> or <code>user_id</code>.</p>
    <h3>Example requests</h3>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-c"># delete one memory</span>
<span class="tok-f">curl</span> -X DELETE <span class="tok-s">"https://agentmemo.dev/memory/forget?id=mem_52fd593fd8b74f6db96a"</span> \\
  -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span>

<span class="tok-c"># forget everything for a user + agent</span>
<span class="tok-f">curl</span> -X DELETE <span class="tok-s">"https://agentmemo.dev/memory/forget?user_id=user_123&agent_id=support_bot"</span> \\
  -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span></code></pre>
    </div>
    <h3>Example response <span style="color:var(--red);font-size:13px;">200 OK</span></h3>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">200 OK · application/json</span></div>
<pre><code>{ <span class="tok-p">"deleted"</span>: <span class="tok-m">1</span> }</code></pre>
    </div>

    <!-- USAGE -->
    <div class="endpoint" id="usage">
      <span class="method m-get">GET</span><span class="path">/usage</span>
    </div>
    <p>Return usage for the calling key &mdash; total requests, embedding tokens, average latency, a per-route breakdown, and daily buckets.</p>
    <h3>Query parameters</h3>
    <table>
      <tr><th>Param</th><th>Type</th><th>Description</th></tr>
      <tr><td><code>from</code> <span class="opt">optional</span></td><td>int (ms)</td><td>Window start. Default: 30 days ago.</td></tr>
      <tr><td><code>to</code> <span class="opt">optional</span></td><td>int (ms)</td><td>Window end. Default: now.</td></tr>
      <tr><td><code>days</code> <span class="opt">optional</span></td><td>int</td><td>Daily buckets to return (max 365).</td></tr>
    </table>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> <span class="tok-s">"https://agentmemo.dev/usage"</span> -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span></code></pre>
    </div>
    <div class="code-window">
      <div class="code-bar"><span class="lbl">200 OK · application/json</span></div>
<pre><code>{
  <span class="tok-p">"totals"</span>: { <span class="tok-p">"requests"</span>: <span class="tok-m">128</span>, <span class="tok-p">"tokens"</span>: <span class="tok-m">3940</span>, <span class="tok-p">"errors"</span>: <span class="tok-m">2</span>, <span class="tok-p">"avg_latency_ms"</span>: <span class="tok-m">41</span> },
  <span class="tok-p">"by_route"</span>: [ { <span class="tok-p">"route"</span>: <span class="tok-s">"POST /memory/store"</span>, <span class="tok-p">"requests"</span>: <span class="tok-m">90</span> } ],
  <span class="tok-p">"daily"</span>: [ { <span class="tok-p">"day"</span>: <span class="tok-s">"2026-06-18"</span>, <span class="tok-p">"requests"</span>: <span class="tok-m">128</span> } ]
}</code></pre>
    </div>

    <footer>© 2026 AgentMemo · <a href="/">Home</a> · <a href="/docs">Docs</a> · Built on Cloudflare Workers</footer>
  </main>
</div>
</body>
</html>`;
