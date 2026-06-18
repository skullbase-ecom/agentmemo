// Dark-theme HTML error pages, returned to browsers (API clients get JSON).

function page(code: string, heading: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${code} — AgentMemo</title>
<meta name="robots" content="noindex" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root { --bg:#07080d; --panel:#11131d; --border:#1f2330; --text:#e7e9f0; --muted:#9097a8; --accent:#7c5cff; --accent-2:#19c2d6; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); min-height:100vh; display:grid; place-items:center; text-align:center; padding:24px; -webkit-font-smoothing:antialiased; }
  .bg { position:fixed; inset:0; z-index:-1; overflow:hidden; }
  .bg::before { content:""; position:absolute; width:520px; height:520px; border-radius:50%; filter:blur(130px); opacity:.22; background:var(--accent); top:-200px; left:50%; transform:translateX(-50%); }
  .code { font-size:88px; font-weight:800; letter-spacing:-.04em; background:linear-gradient(90deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent; line-height:1; }
  h1 { font-size:24px; margin:14px 0 8px; letter-spacing:-.01em; }
  p { color:var(--muted); max-width:420px; margin:0 auto 28px; }
  .row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .btn { display:inline-flex; align-items:center; padding:11px 20px; border-radius:10px; font-weight:600; font-size:14px; border:1px solid var(--border); }
  .btn-primary { background:linear-gradient(135deg,var(--accent),#5b3df0); color:#fff; border-color:transparent; }
  .btn-ghost { background:var(--panel); color:var(--text); }
  .btn-ghost:hover { border-color:#2c3142; }
  .logo { position:fixed; top:22px; left:24px; display:flex; align-items:center; gap:9px; font-weight:700; font-size:16px; color:var(--text); }
  .logo .dot { width:24px; height:24px; border-radius:7px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:grid; place-items:center; font-size:14px; }
</style>
</head>
<body>
<div class="bg"></div>
<a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
<div>
  <div class="code">${code}</div>
  <h1>${heading}</h1>
  <p>${message}</p>
  <div class="row">
    <a class="btn btn-primary" href="/">Back to homepage</a>
    <a class="btn btn-ghost" href="/docs">Read the docs</a>
  </div>
</div>
</body>
</html>`;
}

export const NOT_FOUND_HTML = page(
  "404",
  "Page not found",
  "This page doesn't exist. The memory of it was never stored.",
);

export const ERROR_HTML = page(
  "500",
  "Something went wrong",
  "An unexpected error occurred on our end. Please try again in a moment.",
);
