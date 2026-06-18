// Pricing page on the shared design system.
import { shell } from "./ui";

const DODO = "https://checkout.dodopayments.com/buy/pdt_0NhKvw8RSLuiPu2bD2IQH?quantity=1";

const STYLE = `<style>
.ph{text-align:center;padding:64px 0 8px}
.ph h1{font-size:clamp(2.4rem,5vw,3.4rem);font-weight:800}
.ph p{color:var(--text-2);max-width:560px;margin:14px auto 0}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:980px;margin:44px auto 0}
.pc{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:28px;position:relative}
.pc.pop{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 30px 70px -40px var(--glow)}
.pc .tag{position:absolute;top:-11px;right:22px;background:var(--accent);color:#fff;font-size:11px;font-weight:700;padding:4px 11px;border-radius:999px}
.pc .tier{color:var(--text-2);font-weight:600}
.pc .amt{font-size:38px;font-weight:800;margin:10px 0}.pc .amt span{font-size:14px;color:var(--text-muted);font-weight:500}
.pc ul{list-style:none;margin:18px 0;display:grid;gap:10px}.pc li{color:var(--text-2);font-size:14px;display:flex;gap:9px}.pc li::before{content:"✓";color:var(--accent-2)}
.pc .btn{width:100%;justify-content:center}
.faq{max-width:680px;margin:56px auto 0}.faq h3{font-size:16px;margin:22px 0 6px}.faq p{color:var(--text-2);font-size:14.5px}
@media(max-width:860px){.cards{grid-template-columns:1fr}}
</style>`;

const body = `<div class="ph wrap">
  <span class="eyebrow">Pricing</span>
  <h1>Free &amp; unlimited <span class="accent-text">during beta</span>.</h1>
  <p>AgentMemo is in public beta — everything is free with no usage limits. The plans below are our planned post-beta pricing.</p>
</div>
<section class="section" style="padding-top:0"><div class="wrap">
  <div class="cards">
    <div class="pc pop"><span class="tag">Now — beta</span><div class="tier accent-text">Beta</div><div class="amt">$0<span> / unlimited</span></div>
      <p class="muted" style="font-size:14px">Everything, free, while we're in beta.</p>
      <ul><li><b style="color:var(--text)">Unlimited</b> operations — no caps</li><li>All memory types</li><li>Semantic retrieval, sub-100ms</li><li>MCP server + multi-agent</li><li>No credit card</li></ul>
      <a class="btn btn-primary" href="/signup">Get your free key</a></div>
    <div class="pc"><div class="tier">Pro <span style="color:var(--faint)">(after beta)</span></div><div class="amt">$19<span> / mo</span></div>
      <p class="muted" style="font-size:14px">Planned pricing once beta ends.</p>
      <ul><li>Unlimited operations</li><li>Priority embedding queue</li><li>Unlimited API keys &amp; scopes</li><li>Usage analytics</li><li>Email support</li></ul>
      <a class="btn btn-ghost" href="${DODO}">Upgrade to Pro</a></div>
    <div class="pc"><div class="tier">Enterprise</div><div class="amt">$499<span> / mo</span></div>
      <p class="muted" style="font-size:14px">For teams running agents at scale.</p>
      <ul><li>Custom SLA</li><li>Audit &amp; compliance</li><li>EU data residency</li><li>Dedicated support</li></ul>
      <a class="btn btn-ghost" href="/signup">Contact</a></div>
  </div>
  <p style="text-align:center;color:var(--text-2);max-width:620px;margin:28px auto 0">Agents can upgrade themselves programmatically via <a class="accent-text" href="/docs/agent-payments">Dodo Payments MCP</a> — no human needed.</p>
  <div class="faq">
    <h3>What does beta cost?</h3>
    <p>Nothing. During the public beta, AgentMemo is free and unlimited — no operation caps. A per-key rate limit applies purely as abuse protection.</p>
    <h3>What happens to my key after beta?</h3>
    <p>Your existing API key keeps working. We'll give plenty of notice before any pricing takes effect.</p>
    <h3>What counts as an operation?</h3>
    <p>Any memory API call — storing, retrieving, or forgetting. Tracked for analytics; not capped during beta.</p>
  </div>
</div></section>`;

export const PRICING_HTML = shell({
  title: "Pricing — AgentMemo",
  description: "Free and unlimited during public beta — no usage limits. Future plans shown below.",
  path: "/pricing",
  body: STYLE + body,
});
