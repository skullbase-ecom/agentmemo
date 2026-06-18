// Shared design system (Linear/Vercel-inspired). One source of truth for the
// dark theme, fonts, navbar, and footer so every page is consistent.

export const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';

export const FAVICON =
  '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />';

export const THEME = `
:root{
  --bg:#050505; --bg-elevated:#0f0f0f; --bg-card:#141414; --border:#1f1f1f; --border-hover:#2a2a2a;
  --text:#f5f5f5; --text-2:#a1a1aa; --text-muted:#71717a; --faint:#52525b;
  --accent:#8b5cf6; --accent-hover:#7c3aed; --accent-2:#06b6d4; --glow:rgba(139,92,246,.15);
  --success:#22c55e; --warning:#f59e0b; --error:#ef4444; --code-bg:#0a0a0a;
  --sans:'Inter',system-ui,-apple-system,sans-serif; --mono:'JetBrains Mono',ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--bg);color:var(--text-2);line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,h4{color:var(--text)}
p{color:var(--text-2);line-height:1.7}
a{color:var(--accent);text-decoration:none}
a:hover{color:#a78bfa}
.mono{font-family:var(--mono)}
.accent-text{background:linear-gradient(90deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.muted{color:var(--text-muted)}
/* nav */
.nav{position:sticky;top:0;z-index:100;border-bottom:1px solid transparent;transition:background .2s,border-color .2s}
.nav.scrolled{background:rgba(15,15,15,.8);backdrop-filter:blur(12px);border-color:var(--border)}
.nav .inner{max-width:1120px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;letter-spacing:-.01em;color:var(--text)}
.brand .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.nav-links{display:flex;align-items:center;gap:26px}
.nav-links a.l{color:var(--text-2);font-size:14px;font-weight:500;transition:color .15s}
.nav-links a.l:hover{color:var(--text)}
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;font-weight:600;font-size:14px;border:1px solid transparent;cursor:pointer;transition:transform .12s,background .2s,border-color .2s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-hover);transform:translateY(-1px)}
.btn-ghost{background:transparent;border-color:var(--border);color:var(--text)}
.btn-ghost:hover{border-color:var(--border-hover)}
.btn-lg{padding:13px 24px;font-size:15px}
.hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:8px}
.hamburger span{display:block;width:24px;height:2px;background:#f5f5f5;border-radius:2px;transition:all .3s}
.hamburger.open span:nth-child(1){transform:rotate(45deg) translate(5px,5px)}
.hamburger.open span:nth-child(2){opacity:0}
.hamburger.open span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px)}
.mobile-menu{display:none;background:#0f0f0f;border-top:1px solid var(--border)}
.mobile-menu.open{display:block}
.mobile-menu .inner-m{max-width:1120px;margin:0 auto;padding:8px 24px 18px}
.mobile-menu a{display:block;padding:13px 0;color:var(--text-2);font-size:1rem;border-bottom:1px solid #161616}
.mobile-menu a:hover{color:var(--accent)}
.mobile-menu a.btn{margin-top:16px;border-bottom:0;text-align:center;color:#fff}
/* footer */
.footer{border-top:1px solid var(--border);margin-top:96px;padding:56px 0 40px}
.footer .cols{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;gap:32px}
.footer .brand{margin-bottom:12px}
.footer .tag{color:var(--text-muted);font-size:13px;max-width:220px}
.footer h4{font-size:13px;color:var(--text);margin-bottom:14px;font-weight:600}
.footer a{display:block;color:var(--text-2);font-size:13.5px;padding:4px 0}
.footer a:hover{color:var(--text)}
.footer .bottom{border-top:1px solid var(--border);margin-top:40px;padding-top:24px;color:var(--text-muted);font-size:13px}
/* generic */
.eyebrow{color:var(--accent);font-weight:600;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase}
.section{padding:88px 0}
h1,h2,h3{letter-spacing:-.02em}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:26px;transition:border-color .2s,transform .15s}
.card:hover{border-color:var(--accent)}
.codewin{background:var(--code-bg);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.codebar{display:flex;align-items:center;gap:7px;padding:11px 15px;border-bottom:1px solid var(--border);background:#0c0c0c}
.codebar i{width:11px;height:11px;border-radius:50%;display:inline-block}
.codebar .r{background:#ff5f57}.codebar .y{background:#febc2e}.codebar .g{background:#28c840}
.codebar .fn{margin-left:8px;color:var(--text-muted);font-size:12px;font-family:var(--mono)}
pre.code{padding:18px;overflow-x:auto;font-family:var(--mono);font-size:13px;line-height:1.7;color:#cdd3e0}
.k{color:#c792ea}.s{color:#c3e88d}.f{color:#82aaff}.p{color:#f78c6c}.c{color:#5b6373}.m{color:#06b6d4}
/* ---- Mobile (<=768px) ---- */
@media(max-width:768px){
  .nav-links{display:none}
  .hamburger{display:flex}
  h1{font-size:clamp(1.9rem,7vw,2.6rem)}
  h2{font-size:clamp(1.4rem,5vw,2rem)}
  h3{font-size:1.1rem}
  .section{padding:48px 0}
  .wrap{padding:0 20px}
  /* any multi-column grid -> single column */
  .grid3,.grid2,.cards-3,.cards-2,.price-cards,.cards,.code-grid,.steps,.sdk-cards,.disc-grid,.g2,.stats,.disc-card{grid-template-columns:1fr!important}
  .footer .cols{grid-template-columns:1fr!important;gap:28px}
  /* buttons + CTAs full width, stacked */
  .cta-row{flex-direction:column;align-items:stretch}
  .cta-row .btn,.btn-lg{width:100%;justify-content:center}
  /* hero metrics 2x2 */
  .metrics{flex-wrap:wrap}
  .metrics>div{flex:1 1 40%}
  /* trust signals stack */
  .trust{flex-direction:column;gap:8px;align-items:center}
  /* discovery names tighter */
  .discovery-names{gap:8px}
  .dname{font-size:.8rem}
  /* code smaller, scrollable */
  pre,pre.code,.code{font-size:.78rem}
  /* comparison/data tables scroll horizontally */
  .cmp-scroll,.tbl-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
  table.cmp{min-width:480px}
}
/* ---- Tablet (769–1024px) ---- */
@media(min-width:769px) and (max-width:1024px){
  .wrap{padding:0 32px}
  .grid3,.cards-3{grid-template-columns:repeat(2,1fr)}
  .footer .cols{grid-template-columns:repeat(2,1fr)}
}`;

const NAV_LINKS = [
  ["/", "Home"],
  ["/docs", "Docs"],
  ["/pricing", "Pricing"],
  ["/benchmarks", "Benchmarks"],
  ["/status", "Status"],
  ["/observatory", "Observatory"],
  ["/blog", "Blog"],
  ["/about", "About"],
];

export function nav(): string {
  const links = NAV_LINKS.map(([h, t]) => `<a class="l" href="${h}">${t}</a>`).join("");
  const mlinks = NAV_LINKS.map(([h, t]) => `<a href="${h}">${t}</a>`).join("");
  return `<nav class="nav" id="nav"><div class="inner">
  <a href="/" class="brand"><span class="dot"></span> AgentMemo</a>
  <div class="nav-links">${links}<a class="btn btn-primary" href="/signup">Get API Key →</a></div>
  <button class="hamburger" id="hb" onclick="amToggleMenu()" aria-label="Menu"><span></span><span></span><span></span></button>
</div>
<div class="mobile-menu" id="mobileMenu"><div class="inner-m">${mlinks}<a class="btn btn-primary" href="/signup">Get API Key →</a></div></div>
</nav>
<script>
function amToggleMenu(){document.getElementById('mobileMenu').classList.toggle('open');document.getElementById('hb').classList.toggle('open')}
document.querySelectorAll('#mobileMenu a').forEach(function(a){a.addEventListener('click',function(){document.getElementById('mobileMenu').classList.remove('open');document.getElementById('hb').classList.remove('open')})});
addEventListener('scroll',function(){document.getElementById('nav').classList.toggle('scrolled',scrollY>10)});
</script>`;
}

export function footer(): string {
  return `<footer class="footer"><div class="wrap">
  <div class="cols">
    <div>
      <div class="brand"><span class="dot"></span> AgentMemo</div>
      <div class="tag">Memory for the agentic web.</div>
    </div>
    <div><h4>Product</h4><a href="/docs">Docs</a><a href="/pricing">Pricing</a><a href="/changelog">Changelog</a><a href="/status">Status</a><a href="/benchmarks">Benchmarks</a><a href="/observatory">Observatory</a></div>
    <div><h4>Developers</h4><a href="/docs">API Reference</a><a href="/docs#mcp">MCP Server</a><a href="/api-explorer">OpenAPI</a><a href="/sdk">SDKs</a><a href="/playground">Playground</a></div>
    <div><h4>Security</h4><a href="/security">Security</a><a href="/security#audit">Audit Trail</a><a href="/security#owasp">OWASP ASI06</a><a href="/security#gdpr">GDPR</a></div>
    <div><h4>Discover</h4><a href="/auth.md">auth.md</a><a href="/llms.txt">llms.txt</a><a href="/agent-card.json">agent-card.json</a><a href="/humans.txt">humans.txt</a><a href="/manifesto">Manifesto</a></div>
  </div>
  <div class="bottom">© 2026 AgentMemo · Built by Dr. Nadeem Shaikh · India 🇮🇳</div>
</div></footer>`;
}

/** Full HTML document shell with shared head, nav, and footer. */
export function shell(opts: {
  title: string;
  description: string;
  path: string;
  body: string;
  ogType?: string;
  extraHead?: string;
}): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${opts.title}</title>
<meta name="description" content="${opts.description}"/>
<link rel="canonical" href="https://agentmemo.dev${opts.path}"/>
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large"/>
<meta name="GPTBot" content="all"/><meta name="ClaudeBot" content="all"/><meta name="PerplexityBot" content="all"/>
<meta property="og:title" content="${opts.title}"/>
<meta property="og:description" content="${opts.description}"/>
<meta property="og:type" content="${opts.ogType ?? "website"}"/>
<meta property="og:url" content="https://agentmemo.dev${opts.path}"/>
<meta property="og:site_name" content="AgentMemo"/>
<meta name="twitter:card" content="summary_large_image"/>
${FONTS}${FAVICON}${opts.extraHead ?? ""}
<style>${THEME}</style>
</head><body>
${nav()}
${opts.body}
${footer()}
</body></html>`;
}
