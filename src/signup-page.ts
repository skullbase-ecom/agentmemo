// Self-serve signup page on the shared design system.
import { shell } from "./ui";

const STYLE = `<style>
.su{max-width:460px;margin:0 auto;padding:64px 0 90px}
.su .eyebrow{display:block;text-align:center}
.su h1{font-size:2.4rem;font-weight:800;text-align:center;margin:12px 0 8px}
.su .sub{color:var(--text-2);text-align:center;margin-bottom:30px}
.su label{display:block;font-size:12px;color:var(--text-muted);margin:0 0 6px}
.su input{width:100%;background:var(--code-bg);border:1px solid var(--border);border-radius:9px;padding:12px 13px;color:var(--text);font-size:15px;margin-bottom:14px;outline:none;font-family:inherit}
.su input:focus{border-color:var(--accent)}
.su .btn{width:100%;justify-content:center}
.su .fine{color:var(--text-muted);font-size:12.5px;text-align:center;margin-top:14px}
.su .err{color:var(--error);font-size:14px;margin-bottom:14px;display:none}
.su .result{display:none}
.keybox{background:var(--code-bg);border:1px solid var(--border);border-radius:10px;padding:13px;font-family:var(--mono);font-size:13px;color:var(--success);word-break:break-all;margin:12px 0 8px}
.warn{border-left:3px solid var(--accent);background:var(--bg-card);border-radius:0 10px 10px 0;padding:12px 16px;margin:16px 0;font-size:13.5px;color:var(--text-2)}
</style>`;

const body = `<div class="su wrap">
  <span class="eyebrow">Public beta · Free &amp; unlimited · No credit card</span>
  <h1>Get your <span class="accent-text">API key</span></h1>
  <p class="sub">Create a key instantly — free and unlimited while we're in public beta.</p>

  <div class="card" id="formCard">
    <div class="err" id="err"></div>
    <form id="form">
      <label for="name">Name</label>
      <input id="name" type="text" placeholder="Ada Lovelace" required maxlength="200"/>
      <label for="email">Email <span style="color:var(--faint)">(optional)</span></label>
      <input id="email" type="email" placeholder="you@example.com" maxlength="256"/>
      <button class="btn btn-primary" type="submit" id="submit">Create my API key</button>
    </form>
    <p class="fine">Free and unlimited during beta. Your key appears instantly below — copy it now, it's shown only once.</p>
  </div>

  <div class="card result" id="result">
    <h2 style="font-size:20px;margin-bottom:6px"><span style="color:var(--success)">✓</span> Your API key is ready</h2>
    <p class="muted" style="font-size:14px">Copy and store it now — for security it is shown only once.</p>
    <div class="keybox" id="key"></div>
    <button class="btn btn-ghost" id="copy">Copy key</button>
    <div class="warn">Use it as a bearer token:<br/><span class="mono" style="color:#cdd3e0">Authorization: Bearer &lt;your key&gt;</span></div>
    <div style="font-size:14px;color:var(--text-2);margin-top:14px">Next: <a class="accent-text" href="/docs">read the docs</a> · try the <a class="accent-text" href="/playground">playground</a>.</div>
  </div>
</div>
<script>
  var form=document.getElementById('form'),errEl=document.getElementById('err'),submitBtn=document.getElementById('submit');
  form.addEventListener('submit',async function(e){
    e.preventDefault();errEl.style.display='none';submitBtn.disabled=true;submitBtn.textContent='Creating…';
    try{
      var res=await fetch('/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('name').value.trim(),email:document.getElementById('email').value.trim()})});
      var data=await res.json();
      if(!res.ok)throw new Error((data&&data.error&&(data.error.message||data.error))||'Signup failed');
      document.getElementById('key').textContent=data.api_key||data.key;
      document.getElementById('formCard').style.display='none';document.getElementById('result').style.display='block';
    }catch(ex){errEl.textContent=ex.message||'Something went wrong.';errEl.style.display='block';submitBtn.disabled=false;submitBtn.textContent='Create my API key';}
  });
  document.getElementById('copy').addEventListener('click',async function(){
    try{await navigator.clipboard.writeText(document.getElementById('key').textContent);this.textContent='Copied ✓';}catch(e){this.textContent='Copy failed';}
  });
</script>`;

export const SIGNUP_HTML = shell({
  title: "Get your API key — AgentMemo",
  description: "Create a free AgentMemo API key instantly. Free and unlimited during public beta, no credit card.",
  path: "/signup",
  body: STYLE + body,
});
