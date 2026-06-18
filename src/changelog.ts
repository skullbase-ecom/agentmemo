// Changelog page served at GET /changelog. Data-driven; prepend new entries.

interface ChangelogEntry {
  date: string;
  title: string;
  body: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "June 18, 2026",
    title: "Memory types, intelligence layer & free unlimited beta",
    body: "Five memory types (semantic, episodic, procedural, working, emotional), embedding cache, a public Observatory, and standardized errors. Usage is now free and unlimited during the public beta — no operation limits.",
  },
  {
    date: "June 18, 2026",
    title: "AgentMemo launches",
    body: "Persistent memory API for AI agents. Semantic search, MCP server, agent self-registration via POST /signup.",
  },
];

const entriesHtml = CHANGELOG.map(
  (e) => `      <div class="entry">
        <div class="date">${e.date}</div>
        <div class="card">
          <h2>${e.title}</h2>
          <p>${e.body}</p>
        </div>
      </div>`,
).join("\n");

export const CHANGELOG_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Changelog — AgentMemo</title>
<meta name="description" content="AgentMemo changelog — what's new in the persistent memory API for AI agents." />
<meta name="robots" content="index, follow, max-snippet:-1" />
<link rel="canonical" href="https://agentmemo.dev/changelog" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root { --bg:#07080d; --bg-soft:#0d0f17; --panel:#11131d; --border:#1f2330; --text:#e7e9f0; --muted:#9097a8; --faint:#6b7280; --accent:#7c5cff; --accent-2:#19c2d6; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.65; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  .accent-text { background:linear-gradient(90deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  nav { border-bottom:1px solid var(--border); }
  nav .inner { max-width:760px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; }
  .logo .dot { width:26px; height:26px; border-radius:8px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:grid; place-items:center; font-size:15px; }
  nav .links { display:flex; gap:22px; font-size:14px; } nav .links a { color:var(--muted); } nav .links a:hover { color:var(--text); }
  .wrap { max-width:760px; margin:0 auto; padding:60px 24px 90px; }
  h1 { font-size:40px; letter-spacing:-.02em; font-weight:800; margin-bottom:8px; }
  .lede { color:var(--muted); font-size:17px; margin-bottom:44px; }
  .entry { display:grid; grid-template-columns:160px 1fr; gap:24px; }
  .date { color:var(--faint); font-size:14px; padding-top:24px; }
  .card { background:linear-gradient(180deg,var(--panel),var(--bg-soft)); border:1px solid var(--border); border-radius:14px; padding:24px; margin-bottom:22px; }
  .card h2 { font-size:19px; margin-bottom:8px; }
  .card p { color:var(--muted); font-size:15px; }
  footer { border-top:1px solid var(--border); padding:28px 0; color:var(--faint); font-size:13px; text-align:center; }
  @media (max-width:640px){ .entry { grid-template-columns:1fr; gap:6px; } .date { padding-top:0; } }
</style>
</head>
<body>
<nav><div class="inner">
  <a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
  <div class="links"><a href="/docs">Docs</a><a href="/changelog">Changelog</a><a href="/status">Status</a></div>
</div></nav>

<div class="wrap">
  <h1>Change<span class="accent-text">log</span></h1>
  <p class="lede">What's new in AgentMemo.</p>
${entriesHtml}
</div>

<footer>© 2026 AgentMemo · <a href="/">Home</a> · <a href="/docs">Docs</a> · <a href="/status">Status</a></footer>
</body>
</html>`;
