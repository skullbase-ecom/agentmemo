// Pricing page served at GET /pricing. Dark theme, self-contained.

export const PRICING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pricing — AgentMemo</title>
<meta name="description" content="AgentMemo pricing. Free tier: 10,000 memory operations per month. Pro: $19/month for unlimited operations." />
<meta name="robots" content="index, follow, max-snippet:-1" />
<link rel="canonical" href="https://agentmemo.dev/pricing" />
<meta property="og:title" content="AgentMemo Pricing" />
<meta property="og:description" content="Free: 10,000 operations/month. Pro: $19/month unlimited." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://agentmemo.dev/pricing" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root { --bg:#07080d; --bg-soft:#0d0f17; --panel:#11131d; --border:#1f2330; --text:#e7e9f0; --muted:#9097a8; --faint:#6b7280; --accent:#7c5cff; --accent-2:#19c2d6; --green:#2dd4a7; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
  a { color:inherit; text-decoration:none; }
  .accent-text { background:linear-gradient(90deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .bg-fx { position:fixed; inset:0; z-index:-1; overflow:hidden; }
  .bg-fx::before { content:""; position:absolute; width:560px; height:560px; border-radius:50%; filter:blur(130px); opacity:.26; background:var(--accent); top:-220px; left:50%; transform:translateX(-50%); }

  nav { border-bottom:1px solid var(--border); }
  nav .inner { max-width:1140px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; }
  .logo .dot { width:26px; height:26px; border-radius:8px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:grid; place-items:center; font-size:15px; }
  nav .links { display:flex; gap:24px; font-size:14px; }
  nav .links a { color:var(--muted); } nav .links a:hover { color:var(--text); }

  .wrap { max-width:860px; margin:0 auto; padding:72px 24px 90px; text-align:center; }
  .eyebrow { color:var(--accent-2); font-weight:600; font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  h1 { font-size:clamp(32px,5vw,48px); letter-spacing:-.02em; font-weight:800; margin:12px 0 12px; }
  .sub { color:var(--muted); font-size:18px; margin-bottom:48px; }

  .cards { display:grid; grid-template-columns:repeat(2,1fr); gap:22px; text-align:left; }
  .card { position:relative; background:linear-gradient(180deg,var(--panel),var(--bg-soft)); border:1px solid var(--border); border-radius:18px; padding:34px; }
  .card.pro { border-color:var(--accent); box-shadow:0 0 0 1px var(--accent),0 30px 70px -40px rgba(124,92,255,.7); }
  .tier { font-size:14px; color:var(--muted); font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
  .amount { font-size:46px; font-weight:800; letter-spacing:-.03em; margin:14px 0 4px; }
  .amount span { font-size:16px; color:var(--faint); font-weight:500; }
  ul { list-style:none; margin:22px 0 26px; display:grid; gap:13px; }
  li { display:flex; gap:10px; color:var(--muted); font-size:14.5px; }
  li .chk { color:var(--accent-2); } .card.pro li .chk { color:var(--green); }
  .pop { position:absolute; top:-12px; right:26px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff; font-size:12px; font-weight:700; padding:5px 12px; border-radius:999px; }
  .btn { display:block; text-align:center; padding:13px; border-radius:10px; font-weight:600; font-size:15px; border:1px solid var(--border); }
  .btn-ghost { background:var(--panel); color:var(--text); } .btn-ghost:hover { border-color:#2c3142; }
  .btn-primary { background:linear-gradient(135deg,var(--accent),#5b3df0); color:#fff; border-color:transparent; box-shadow:0 6px 24px -6px rgba(124,92,255,.6); }
  .btn-primary:hover { transform:translateY(-1px); }
  .faq { margin-top:56px; text-align:left; }
  .faq h3 { font-size:16px; margin:22px 0 6px; }
  .faq p { color:var(--muted); font-size:14.5px; }

  footer { border-top:1px solid var(--border); margin-top:40px; padding:34px 0; color:var(--faint); font-size:14px; text-align:center; }
  footer a:hover { color:var(--text); }
  @media (max-width:760px){ .cards { grid-template-columns:1fr; } nav .links a.hide { display:none; } }
</style>
</head>
<body>
<div class="bg-fx"></div>
<nav><div class="inner">
  <a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
  <div class="links"><a href="/docs" class="hide">Docs</a><a href="/pricing">Pricing</a><a href="/about" class="hide">About</a><a href="/signup">Get API Key</a></div>
</div></nav>

<div class="wrap">
  <div class="eyebrow">Pricing</div>
  <h1>Start free. Scale when <span class="accent-text">your agents do</span>.</h1>
  <p class="sub">Pay for memory, not meetings. No setup fees, no per-seat pricing.</p>

  <div class="cards">
    <div class="card">
      <div class="tier">Free</div>
      <div class="amount">$0<span> / month</span></div>
      <p style="color:var(--muted);font-size:14px">For prototypes and side projects.</p>
      <ul>
        <li><span class="chk">✓</span> 10,000 operations / month</li>
        <li><span class="chk">✓</span> Semantic retrieval included</li>
        <li><span class="chk">✓</span> Edge-cached, sub-100ms</li>
        <li><span class="chk">✓</span> 1 API key</li>
        <li><span class="chk">✓</span> Community support</li>
      </ul>
      <a class="btn btn-ghost" href="/signup">Get started free</a>
    </div>
    <div class="card pro">
      <span class="pop">Most popular</span>
      <div class="tier accent-text">Pro</div>
      <div class="amount">$19<span> / month</span></div>
      <p style="color:var(--muted);font-size:14px">For production agents at scale.</p>
      <ul>
        <li><span class="chk">✓</span> <b style="color:var(--text)">Unlimited</b> operations</li>
        <li><span class="chk">✓</span> Priority embedding queue</li>
        <li><span class="chk">✓</span> Unlimited API keys & scopes</li>
        <li><span class="chk">✓</span> Usage analytics</li>
        <li><span class="chk">✓</span> Email support</li>
      </ul>
      <a class="btn btn-primary" href="/signup?plan=pro">Upgrade to Pro</a>
    </div>
  </div>

  <div class="faq">
    <h3>What counts as an operation?</h3>
    <p>Any memory API call — storing, retrieving, or forgetting a memory. The free tier resets on the 1st of each month.</p>
    <h3>What happens when I hit the free limit?</h3>
    <p>Requests return a clear 429 until the month resets or you upgrade to Pro for unlimited usage.</p>
    <h3>How do I upgrade?</h3>
    <p>Start on the free tier, then upgrade to Pro anytime — your existing API key keeps working, with the limit lifted.</p>
  </div>
</div>

<footer>
  © 2026 AgentMemo · <a href="/">Home</a> · <a href="/docs">Docs</a> · <a href="/about">About</a> · Memory infrastructure for AI agents
</footer>
</body>
</html>`;
