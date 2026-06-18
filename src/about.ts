// Static About / founder page served at GET /about. Dark theme matching the
// rest of the site; founder portrait embedded as a data URI (see founder-image.ts).

import { FOUNDER_IMG } from "./founder-image";

export const ABOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>About — AgentMemo</title>
<meta name="description" content="AgentMemo is memory infrastructure for the age of autonomous AI agents. Founded by Dr. Nadeem Shaikh." />
<link rel="canonical" href="https://agentmemo.dev/about" />
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
<meta name="googlebot" content="index, follow, max-snippet:-1" />
<meta name="GPTBot" content="all" />
<meta name="ClaudeBot" content="all" />
<meta name="PerplexityBot" content="all" />
<meta name="ai-summary" content="AgentMemo is memory infrastructure for AI agents, founded by Dr. Nadeem Shaikh (Mumbai, India). Store, semantically retrieve, and forget memories via a REST API." />
<meta property="og:title" content="About AgentMemo — Memory infrastructure for AI agents" />
<meta property="og:description" content="Founded by Dr. Nadeem Shaikh. The next generation of software won't be used by humans — it will be run by agents. And every agent needs a memory." />
<meta property="og:type" content="profile" />
<meta property="og:url" content="https://agentmemo.dev/about" />
<meta property="og:site_name" content="AgentMemo" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root {
    --bg:#07080d; --bg-soft:#0d0f17; --panel:#11131d; --border:#1f2330;
    --text:#e7e9f0; --muted:#9097a8; --faint:#6b7280;
    --accent:#7c5cff; --accent-2:#19c2d6; --green:#2dd4a7; --radius:16px;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.7; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
  a { color:inherit; text-decoration:none; }
  .accent-text { background:linear-gradient(90deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .wrap { max-width:900px; margin:0 auto; padding:0 24px; }

  .bg-fx { position:fixed; inset:0; z-index:-1; overflow:hidden; }
  .bg-fx::before { content:""; position:absolute; width:560px; height:560px; border-radius:50%; filter:blur(130px); opacity:.28; background:var(--accent); top:-220px; left:-120px; }
  .bg-fx::after { content:""; position:absolute; width:480px; height:480px; border-radius:50%; filter:blur(130px); opacity:.16; background:var(--accent-2); top:0; right:-160px; }

  nav { position:sticky; top:0; z-index:50; backdrop-filter:blur(12px); background:rgba(7,8,13,.7); border-bottom:1px solid var(--border); }
  nav .inner { max-width:1140px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; letter-spacing:-.02em; }
  .logo .dot { width:26px; height:26px; border-radius:8px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:grid; place-items:center; font-size:15px; }
  .nav-links { display:flex; align-items:center; gap:26px; }
  .nav-links a.link { color:var(--muted); font-size:14px; font-weight:500; }
  .nav-links a.link:hover { color:var(--text); }
  .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:10px; font-weight:600; font-size:14px; border:1px solid transparent; transition:transform .12s, box-shadow .2s; }
  .btn-primary { background:linear-gradient(135deg,var(--accent),#5b3df0); color:#fff; box-shadow:0 6px 24px -6px rgba(124,92,255,.6); }
  .btn-primary:hover { transform:translateY(-1px); }
  .btn-ghost { background:var(--panel); border:1px solid var(--border); color:var(--text); }
  .btn-ghost:hover { border-color:#2c3142; }

  header.hero { padding:72px 0 28px; text-align:center; }
  .eyebrow { color:var(--accent-2); font-weight:600; font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .portrait { width:168px; height:210px; object-fit:cover; border-radius:18px; border:1px solid var(--border); margin:26px auto 22px; display:block; box-shadow:0 30px 70px -34px rgba(0,0,0,.9); filter:grayscale(100%); }
  h1 { font-size:clamp(30px,5vw,46px); letter-spacing:-.02em; font-weight:800; line-height:1.1; }
  .role { color:var(--muted); margin-top:10px; font-size:17px; }
  .role b { color:var(--text); font-weight:600; }
  .location { color:var(--faint); font-size:14px; margin-top:6px; display:inline-flex; align-items:center; gap:7px; }

  article { max-width:680px; margin:18px auto 0; }
  article p { color:#c2c8d6; font-size:18px; margin:22px 0; }
  article p.lead { font-size:20px; color:var(--text); }
  article p .accent-text { font-weight:600; }
  .rule { height:1px; background:var(--border); max-width:680px; margin:48px auto; }

  .cta-band { max-width:680px; margin:0 auto; text-align:center; background:linear-gradient(180deg,var(--bg-soft),var(--panel)); border:1px solid var(--border); border-radius:20px; padding:42px 28px; }
  .cta-band h2 { font-size:26px; letter-spacing:-.01em; }
  .cta-band p { color:var(--muted); margin:10px 0 24px; }
  .cta-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }

  footer { border-top:1px solid var(--border); margin-top:72px; padding:34px 0; color:var(--faint); font-size:14px; }
  footer .inner { max-width:1140px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
  footer a:hover { color:var(--text); }

  @media (max-width:760px) {
    .nav-links a.link { display:none; }
    article p { font-size:16.5px; }
    header.hero { padding:48px 0 18px; }
  }
</style>
</head>
<body>
<div class="bg-fx"></div>

<nav>
  <div class="inner">
    <a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
    <div class="nav-links">
      <a class="link" href="/#how">How it works</a>
      <a class="link" href="/#pricing">Pricing</a>
      <a class="link" href="/docs">Docs</a>
      <a class="link" href="/about">About</a>
      <a class="btn btn-primary" href="/#get-key">Get API Key</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <span class="eyebrow">About the founder</span>
    <img class="portrait" src="${FOUNDER_IMG}" alt="Dr. Nadeem Shaikh, founder of AgentMemo" width="168" height="210" />
    <h1>Dr. Nadeem <span class="accent-text">Shaikh</span></h1>
    <p class="role"><b>Founder</b>, AgentMemo</p>
    <p class="location">📍 Based in Mumbai, India · Building for the world</p>
  </div>
</header>

<article class="wrap">
  <p class="lead">Dr. Nadeem Shaikh is the founder of AgentMemo, a memory infrastructure platform built for the age of autonomous AI agents.</p>

  <p>As AI agents multiply across industries — writing code, managing workflows, serving customers, and making decisions — they face a fundamental problem: every session starts from zero. No memory of past interactions. No context. No continuity. AgentMemo solves this at infrastructure level, giving agents the ability to store, search, and recall information across millions of interactions in milliseconds.</p>

  <p>Built for scale from day one, AgentMemo is designed to serve millions of agents simultaneously — running 24/7, globally distributed, with sub-100ms response times. Developers integrate in minutes with two lines of code. Agents retrieve semantically relevant memories instantly, regardless of how much time has passed.</p>

  <p>Nadeem built AgentMemo because he believes the next generation of software won't be used by humans — it will be run by agents. And <span class="accent-text">every agent needs a memory.</span></p>

  <div class="rule"></div>

  <div class="cta-band">
    <h2>Give your agents a memory.</h2>
    <p>Integrate in minutes. Store your first memory in under a minute.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="/#get-key">Get your API key</a>
      <a class="btn btn-ghost" href="/docs">Read the docs</a>
    </div>
  </div>
</article>

<footer>
  <div class="inner">
    <div class="logo" style="font-size:16px;"><span class="dot">🧠</span> AgentMemo</div>
    <div style="display:flex;gap:24px;">
      <a href="/">Home</a>
      <a href="/docs">Docs</a>
      <a href="/about">About</a>
    </div>
    <div>© 2026 AgentMemo · Memory infrastructure for AI agents</div>
  </div>
</footer>
</body>
</html>`;
