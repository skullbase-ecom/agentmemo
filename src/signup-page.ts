// Self-serve signup page served at GET /signup. Posts to POST /signup and shows
// the minted API key inline. Self-contained (inline CSS + JS, no external reqs).

export const SIGNUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Get your API key — AgentMemo</title>
<meta name="description" content="Create a free AgentMemo API key instantly. Free and unlimited during public beta, no credit card." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://agentmemo.dev/signup" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
<style>
  :root { --bg:#07080d; --bg-soft:#0d0f17; --panel:#11131d; --border:#1f2330; --text:#e7e9f0; --muted:#9097a8; --faint:#6b7280; --accent:#7c5cff; --accent-2:#19c2d6; --green:#2dd4a7; --red:#ff6b81; --code-bg:#0a0c13; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; -webkit-font-smoothing:antialiased; min-height:100vh; }
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

  .wrap { max-width:480px; margin:0 auto; padding:64px 24px 80px; }
  .eyebrow { color:var(--accent-2); font-weight:600; font-size:13px; letter-spacing:.08em; text-transform:uppercase; text-align:center; }
  h1 { font-size:34px; letter-spacing:-.02em; font-weight:800; text-align:center; margin:12px 0 10px; }
  .sub { color:var(--muted); text-align:center; margin-bottom:32px; }

  .card { background:linear-gradient(180deg,var(--panel),var(--bg-soft)); border:1px solid var(--border); border-radius:18px; padding:30px; }
  label { display:block; font-size:13px; color:var(--muted); margin:0 0 7px; font-weight:500; }
  input { width:100%; background:var(--code-bg); border:1px solid var(--border); border-radius:10px; padding:12px 14px; color:var(--text); font-size:15px; margin-bottom:18px; outline:none; transition:border-color .15s; }
  input:focus { border-color:var(--accent); }
  button { width:100%; border:0; cursor:pointer; padding:14px; border-radius:10px; font-weight:600; font-size:15px; background:linear-gradient(135deg,var(--accent),#5b3df0); color:#fff; box-shadow:0 6px 24px -6px rgba(124,92,255,.6); transition:transform .12s, opacity .2s; }
  button:hover { transform:translateY(-1px); }
  button:disabled { opacity:.6; cursor:not-allowed; transform:none; }
  .fine { color:var(--faint); font-size:12.5px; text-align:center; margin-top:16px; }
  .err { color:var(--red); font-size:14px; margin-bottom:16px; display:none; }

  .result { display:none; }
  .result h2 { font-size:20px; margin-bottom:6px; }
  .result .ok { color:var(--green); font-weight:600; }
  .keybox { background:var(--code-bg); border:1px solid var(--border); border-radius:10px; padding:14px; font-family:"SF Mono",Menlo,monospace; font-size:13.5px; color:var(--green); word-break:break-all; margin:14px 0 6px; }
  .copy { width:auto; padding:9px 16px; font-size:13px; background:var(--panel); border:1px solid var(--border); color:var(--text); box-shadow:none; }
  .warn { border-left:3px solid var(--accent); background:var(--panel); border-radius:0 10px 10px 0; padding:12px 16px; margin:18px 0; font-size:13.5px; color:var(--muted); }
  .next { font-size:14px; color:var(--muted); margin-top:18px; }
  .next code { background:#161925; border:1px solid var(--border); border-radius:6px; padding:2px 7px; font-size:12.5px; color:#e7e9f0; }
</style>
</head>
<body>
<div class="bg-fx"></div>
<nav><div class="inner">
  <a href="/" class="logo"><span class="dot">🧠</span> AgentMemo</a>
  <div class="links"><a href="/docs">Docs</a><a href="/#pricing">Pricing</a><a href="/about">About</a></div>
</div></nav>

<div class="wrap">
  <div class="eyebrow">Public beta · Free &amp; unlimited · No credit card</div>
  <h1>Get your <span class="accent-text">API key</span></h1>
  <p class="sub">Create a key instantly — free and unlimited while we're in public beta.</p>

  <div class="card" id="formCard">
    <div class="err" id="err"></div>
    <form id="form">
      <label for="name">Name</label>
      <input id="name" name="name" type="text" placeholder="Ada Lovelace" required maxlength="200" />
      <label for="email">Email <span style="color:var(--faint)">(optional)</span></label>
      <input id="email" name="email" type="email" placeholder="you@example.com" maxlength="256" />
      <button type="submit" id="submit">Create my API key</button>
    </form>
    <p class="fine">Free and unlimited during beta. Your key appears instantly below — copy it now, it's shown only once.</p>
  </div>

  <div class="card result" id="result">
    <h2><span class="ok">✓</span> Your API key is ready</h2>
    <p style="color:var(--muted);font-size:14px">Copy and store it now — for security it is shown only once.</p>
    <div class="keybox" id="key"></div>
    <button class="copy" id="copy">Copy key</button>
    <div class="warn">Use it as a bearer token on every request:<br/><span style="font-family:monospace;color:#cdd3e0">Authorization: Bearer &lt;your key&gt;</span></div>
    <div class="next">Next: <a class="accent-text" href="/docs">read the docs</a> and store your first memory with <code>POST /memory/store</code>.</div>
  </div>
</div>

<script>
  const form = document.getElementById('form');
  const errEl = document.getElementById('err');
  const submitBtn = document.getElementById('submit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    submitBtn.disabled = true; submitBtn.textContent = 'Creating…';
    try {
      const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('name').value.trim(),
          email: document.getElementById('email').value.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data && data.error && (data.error.message || data.error)) || 'Signup failed');
      document.getElementById('key').textContent = data.api_key || data.key;
      document.getElementById('formCard').style.display = 'none';
      document.getElementById('result').style.display = 'block';
    } catch (ex) {
      errEl.textContent = ex.message || 'Something went wrong. Please try again.';
      errEl.style.display = 'block';
      submitBtn.disabled = false; submitBtn.textContent = 'Create my API key';
    }
  });
  document.getElementById('copy').addEventListener('click', async () => {
    const k = document.getElementById('key').textContent;
    try { await navigator.clipboard.writeText(k); document.getElementById('copy').textContent = 'Copied ✓'; }
    catch (e) { document.getElementById('copy').textContent = 'Copy failed'; }
  });
</script>
</body>
</html>`;
