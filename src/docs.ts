// API documentation page on the shared design system (two-column sidebar).
import { shell } from "./ui";

const DOCS_STYLE = `<style>
:root{--muted:var(--text-2);--faint:var(--text-muted);--panel:var(--bg-card);--green:var(--success);--red:var(--error);--orange:#f78c6c}
.layout{max-width:1120px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:230px 1fr;gap:48px}
aside{position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);overflow-y:auto;padding:34px 0}
aside .group{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);margin:20px 0 10px;font-weight:600}
aside a{display:block;color:var(--muted);font-size:14px;padding:6px 0}
aside a:hover{color:var(--text)}
main{padding:40px 0 100px;min-width:0;max-width:760px}
main a{color:var(--accent-2)}
main h1{font-size:40px;font-weight:800}
.lede{color:var(--muted);font-size:18px;margin:14px 0 8px}
main h2{font-size:26px;margin:56px 0 14px;scroll-margin-top:80px;padding-top:8px}
main h3{font-size:17px;margin:28px 0 10px}
main p{color:var(--muted);margin:12px 0}
main p strong,main li strong{color:var(--text);font-weight:600}
main ul{color:var(--muted);margin:12px 0 12px 22px}
.endpoint{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:54px 0 6px;scroll-margin-top:80px}
.method{font-family:var(--mono);font-size:12px;font-weight:700;padding:4px 10px;border-radius:7px}
.m-post{background:rgba(34,197,94,.15);color:var(--success);border:1px solid rgba(34,197,94,.35)}
.m-get{background:rgba(6,182,212,.15);color:var(--accent-2);border:1px solid rgba(6,182,212,.35)}
.m-del{background:rgba(239,68,68,.13);color:var(--error);border:1px solid rgba(239,68,68,.35)}
.path{font-family:var(--mono);font-size:18px;color:var(--text);font-weight:600}
.code-window{background:var(--code-bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin:16px 0}
.code-bar{display:flex;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);background:#0c0c0c;gap:8px}
.code-bar .lbl{color:var(--faint);font-size:12px;font-family:var(--mono)}
pre{padding:18px;overflow-x:auto;font-size:13px;line-height:1.7;color:#cdd3e0;font-family:var(--mono)}
.tok-c{color:#5b6373}.tok-k{color:#c792ea}.tok-s{color:#c3e88d}.tok-f{color:#82aaff}.tok-p{color:#f78c6c}.tok-m{color:var(--accent-2)}
main p code,main li code,td code{background:#161925;border:1px solid var(--border);border-radius:5px;padding:1px 6px;font-size:12.5px;color:var(--text);font-family:var(--mono)}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}
th{color:var(--faint);font-size:12px;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
td{color:var(--muted)}
td:first-child code{color:var(--orange)}
.req{color:var(--error);font-size:11px;font-weight:600}.opt{color:var(--faint);font-size:11px}
.note{border-left:3px solid var(--accent);background:var(--panel);border-radius:0 10px 10px 0;padding:14px 18px;margin:18px 0;font-size:14px}
.note strong{color:var(--text)}
@media(max-width:880px){.layout{grid-template-columns:1fr;gap:0}aside{display:none}main{padding:30px 0 80px}}
</style>`;

const DOCS_BODY = `<div class="layout">
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
    <div class="group">Memory types</div>
    <a href="#types">Overview</a>
    <a href="#episodic">Episodic</a>
    <a href="#procedural">Procedural</a>
    <a href="#working">Working</a>
    <a href="#emotional">Emotional</a>
    <div class="group">Account</div>
    <a href="#usage">Usage</a>
    <div class="group">Integrations</div>
    <a href="#signup">Get a key</a>
    <a href="#mcp">MCP server</a>
  </aside>

  <main>
    <h1>API <span class="accent-text">Reference</span></h1>
    <p class="lede">AgentMemo gives your AI agents persistent, semantically-searchable memory over a tiny REST API. Three verbs &mdash; store, retrieve, forget &mdash; plus authentication and usage.</p>

    <h2 id="intro">Introduction</h2>
    <p>Every request is JSON over HTTPS. All memory is scoped to your API key, so data from different keys is fully isolated. Embeddings and vector ranking are handled for you &mdash; you send plain text, we make it searchable.</p>

    <h2 id="base-url">Base URL</h2>
    <div class="code-window"><div class="code-bar"><span class="lbl">base url</span></div>
<pre><code><span class="tok-m">https://agentmemo.dev</span></code></pre></div>

    <h2 id="auth">Authentication</h2>
    <p>Authenticate every request with your secret API key in the <code>Authorization</code> header as a bearer token. Keys look like <code>am_sk_...</code> and are shown only once when created.</p>
    <div class="code-window"><div class="code-bar"><span class="lbl">Authorization header</span></div>
<pre><code><span class="tok-p">Authorization</span>: <span class="tok-k">Bearer</span> <span class="tok-s">am_sk_your_secret_key</span></code></pre></div>
    <p>Keys carry scopes: <code>read</code> (retrieve, usage) and <code>write</code> (store, forget). Don't have a key yet? <a href="/signup">Get one here</a>.</p>
    <div class="note"><strong>Keep keys secret.</strong> Treat <code>am_sk_</code> keys like passwords &mdash; use them only from server-side code, never in a browser or mobile client.</div>

    <h2 id="errors">Errors</h2>
    <p>Errors return the matching HTTP status and a JSON body of the form <code>{ "error", "code", "docs" }</code>.</p>
    <table>
      <tr><th>Status</th><th>Meaning</th></tr>
      <tr><td><code>400</code></td><td>Invalid request &mdash; missing or malformed fields.</td></tr>
      <tr><td><code>401</code></td><td>Missing or invalid API key.</td></tr>
      <tr><td><code>403</code></td><td>Key revoked, missing scope, or trust score too low.</td></tr>
      <tr><td><code>404</code></td><td>Resource (e.g. a memory id) not found.</td></tr>
      <tr><td><code>429</code></td><td>Rate limit exceeded (abuse protection).</td></tr>
    </table>

    <div class="endpoint" id="store"><span class="method m-post">POST</span><span class="path">/memory/store</span></div>
    <p>Store a memory. The <code>content</code> is embedded automatically so it becomes semantically retrievable. Also accepts <code>importance</code> (0&ndash;10), <code>ttl_seconds</code>, <code>tags</code>, <code>namespace</code>, <code>outcome</code>, and <code>detect_conflicts</code>. Requires the <code>write</code> scope.</p>
    <h3>Body parameters</h3>
    <table>
      <tr><th>Field</th><th>Type</th><th>Description</th></tr>
      <tr><td><code>user_id</code> <span class="req">required</span></td><td>string</td><td>End-user this memory belongs to.</td></tr>
      <tr><td><code>agent_id</code> <span class="req">required</span></td><td>string</td><td>Agent that owns the memory.</td></tr>
      <tr><td><code>content</code> <span class="req">required</span></td><td>string</td><td>The memory text. Up to 100,000 chars.</td></tr>
      <tr><td><code>metadata</code> <span class="opt">optional</span></td><td>object</td><td>Arbitrary JSON returned with the memory.</td></tr>
    </table>
    <h3>Example request</h3>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X POST <span class="tok-m">https://agentmemo.dev/memory/store</span> \\
  -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span> \\
  -H <span class="tok-s">"Content-Type: application/json"</span> \\
  -d <span class="tok-s">'{ "user_id":"user_123", "agent_id":"support_bot", "content":"Prefers email; on the Pro plan." }'</span></code></pre></div>

    <div class="endpoint" id="retrieve"><span class="method m-get">GET</span><span class="path">/memory/retrieve</span></div>
    <p>Semantically search a user's memories with composite scoring (semantic + outcome + importance + recency). Filters: <code>namespace</code>, <code>tags</code>, <code>min_importance</code>, <code>outcome</code>, <code>include_expired</code>. Requires <code>read</code>.</p>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> <span class="tok-s">"https://agentmemo.dev/memory/retrieve?user_id=user_123&q=how+to+contact+them&limit=3"</span> \\
  -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span></code></pre></div>

    <div class="endpoint" id="forget"><span class="method m-del">DELETE</span><span class="path">/memory/forget</span></div>
    <p>Delete a single memory by <code>id</code>, or a whole scope by <code>user_id</code> (optionally narrowed by <code>agent_id</code>). Deletes are always restricted to your own key. Requires <code>write</code>.</p>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X DELETE <span class="tok-s">"https://agentmemo.dev/memory/forget?id=mem_..."</span> -H <span class="tok-s">"Authorization: Bearer am_sk_your_key"</span></code></pre></div>

    <h2 id="types">Memory types</h2>
    <p>AgentMemo offers five human-like memory types, all under <code>/memory/*</code> with the same bearer auth.</p>

    <h3 id="episodic">Episodic — sessions you can replay</h3>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X POST <span class="tok-m">/memory/episodes/start</span> -d <span class="tok-s">'{"agent_id":"a1","user_id":"u1","title":"Support chat"}'</span>
<span class="tok-f">curl</span> -X POST <span class="tok-m">/memory/episodes/event</span> -d <span class="tok-s">'{"episode_id":"ep_...","content":"User reported login failure"}'</span>
<span class="tok-f">curl</span> -X POST <span class="tok-m">/memory/episodes/end</span>   -d <span class="tok-s">'{"episode_id":"ep_..."}'</span></code></pre></div>

    <h3 id="procedural">Procedural — how to do things</h3>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X POST <span class="tok-m">/memory/procedures</span> -d <span class="tok-s">'{"agent_id":"a1","name":"Generate report","steps":["fetch","analyze","format"]}'</span>
<span class="tok-f">curl</span> <span class="tok-m">"/memory/procedures/match?agent_id=a1&q=user+wants+a+summary"</span></code></pre></div>

    <h3 id="working">Working — short-term RAM (1h TTL)</h3>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X POST <span class="tok-m">/memory/working</span> -d <span class="tok-s">'{"session_id":"s1","content":{"step":"awaiting confirmation"}}'</span></code></pre></div>

    <h3 id="emotional">Emotional — sentiment &amp; trust</h3>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X POST <span class="tok-m">/memory/emotional</span> -d <span class="tok-s">'{"agent_id":"a1","user_id":"u1","sentiment":"positive","intensity":8}'</span>
<span class="tok-f">curl</span> <span class="tok-m">"/memory/emotional/profile?user_id=u1&agent_id=a1"</span></code></pre></div>

    <h3>More</h3>
    <p>Also available: <code>/memory/context</code> (LLM injection), <code>/memory/batch</code>, <code>/memory/feedback</code>, <code>/memory/stats</code>, <code>/memory/graph/*</code>, <code>/memory/compress</code>, <code>/memory/export</code>, <code>/agents/*</code>. Full machine spec: <a href="/openapi.json">/openapi.json</a>.</p>

    <div class="endpoint" id="usage"><span class="method m-get">GET</span><span class="path">/usage</span></div>
    <p>Usage for the calling key. <strong>Beta:</strong> usage is free and unlimited — <code>used</code> is informational only; a per-key rate limit applies as abuse protection.</p>

    <h2 id="signup">Get an API key</h2>
    <p>Self-serve and agent-first — no auth, no email, no approval. The key is returned directly in the response.</p>
    <div class="code-window"><div class="code-bar"><span class="lbl">cURL</span></div>
<pre><code><span class="tok-f">curl</span> -X POST <span class="tok-m">https://agentmemo.dev/signup</span> -d <span class="tok-s">'{ "name": "My Agent" }'</span>
<span class="tok-c"># → { "api_key": "am_sk_...", "tier": "beta", "unlimited": true, "mcp": "..." }</span></code></pre></div>

    <h2 id="mcp">MCP server &amp; Claude Managed Agents</h2>
    <p>AgentMemo is a native <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server. Add it to any Claude Managed Agent in one line:</p>
    <div class="code-window"><div class="code-bar"><span class="lbl">agent.json</span></div>
<pre><code>{
  <span class="tok-p">"mcp_servers"</span>: [{
    <span class="tok-p">"type"</span>: <span class="tok-s">"url"</span>,
    <span class="tok-p">"name"</span>: <span class="tok-s">"agentmemo"</span>,
    <span class="tok-p">"url"</span>: <span class="tok-s">"https://agentmemo.dev/mcp"</span>,
    <span class="tok-p">"authorization_token"</span>: <span class="tok-s">"Bearer am_sk_your_key"</span>
  }]
}</code></pre></div>
    <p>Tools: <code>store_memory</code>, <code>retrieve_memory</code>, <code>get_context</code>, <code>forget_memory</code>, <code>give_feedback</code>, <code>get_stats</code>, <code>get_usage</code>. Manifest: <a href="/.well-known/mcp/server-card.json">server-card.json</a>. SDKs: <a href="/sdk">/sdk</a>.</p>
  </main>
</div>`;

export const DOCS_HTML = shell({
  title: "API Docs — AgentMemo",
  description: "AgentMemo API reference: authenticate, store, semantically retrieve, and forget agent memories. Memory types, MCP, SDKs, and Claude Managed Agents.",
  path: "/docs",
  ogType: "article",
  body: DOCS_STYLE + DOCS_BODY,
});
