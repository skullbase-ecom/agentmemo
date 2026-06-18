// About / founder page on the shared design system.
import { shell } from "./ui";
import { FOUNDER_IMG } from "./founder-image";

const STYLE = `<style>
.ab{padding:64px 0 90px;text-align:center}
.ab-hero h1{font-size:clamp(2.2rem,5vw,3.4rem);font-weight:800;letter-spacing:-.03em}
.ab-hero p{color:var(--text-2);margin-top:14px;font-size:1.1rem}
.founder{margin:56px 0 8px}
.avatar{width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #8b5cf6;box-shadow:0 0 20px rgba(139,92,246,.3);background:#1a1a1a;margin:0 auto 18px;display:block}
.founder .name{font-size:1.8rem;font-weight:800;color:#f5f5f5}
.founder .title{color:var(--text-2);margin-top:4px}
.founder .loc{color:var(--text-muted);font-size:.9rem;margin-top:4px}
.pull{font-size:clamp(1.4rem,3vw,2rem);color:#8b5cf6;font-weight:700;font-style:italic;margin:48px auto;max-width:640px}
.story{max-width:640px;margin:0 auto;text-align:left;line-height:1.8;color:var(--text-2)}
.story p{margin:18px 0}
.disc-h{color:#404040;letter-spacing:.1em;text-transform:uppercase;font-size:.8rem;margin:64px 0 24px}
.disc-grid{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;max-width:760px;margin:0 auto}
.disc-card{background:#141414;border:1px solid #1f1f1f;border-left:3px solid #8b5cf6;padding:16px 24px;border-radius:8px;text-align:left;min-width:200px;opacity:0;animation:cardIn .5s ease forwards;transition:border-left-color .3s,box-shadow .3s}
.disc-card:hover{border-left-color:#a78bfa;box-shadow:0 0 22px rgba(139,92,246,.25)}
.disc-card .co{color:#f5f5f5;font-weight:600}
.disc-card .sub{color:var(--text-2);font-size:.82rem;margin-top:2px}
@keyframes cardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.closing{color:#f5f5f5;font-size:clamp(1.1rem,2vw,1.4rem);font-weight:700;margin-top:60px;line-height:1.5}
.contact{color:var(--text-muted);font-size:.92rem;margin-top:28px}
.contact a{color:#8b5cf6}
</style>`;

const CARDS = [
  ["Anthropic", "Claude AI Systems"],
  ["OpenAI", "GPT AI Systems"],
  ["Google", "Search & AI Systems"],
  ["Microsoft", "Bing AI Systems"],
  ["Apple", "Apple Intelligence"],
];

const cards = CARDS.map(
  ([co, sub], i) =>
    `<div class="disc-card" style="animation-delay:${500 + i * 300}ms"><div class="co">${co}</div><div class="sub">${sub}</div></div>`,
).join("");

const body = `${STYLE}<div class="ab wrap">
  <div class="ab-hero">
    <h1>Built in India. <span class="accent-text">For the world.</span></h1>
    <p>One developer. One day. Discovered by five AI giants.</p>
  </div>

  <div class="founder">
    <img class="avatar" src="${FOUNDER_IMG}" alt="Dr. Nadeem Shaikh"/>
    <div class="name">Dr. Nadeem Shaikh</div>
    <div class="title">Founder, AgentMemo</div>
    <div class="loc">India 🇮🇳</div>
  </div>

  <div class="pull">"Every agent needs a memory."</div>

  <div class="story">
    <p>Dr. Nadeem Shaikh is a developer and entrepreneur from India.</p>
    <p>He built AgentMemo because he saw a fundamental problem coming before most people recognized it existed.</p>
    <p>As AI agents multiply across every industry — writing code, serving customers, conducting research, managing workflows — they all share one critical limitation: every session starts from zero. No memory. No continuity. No learning.</p>
    <p>AgentMemo is the infrastructure layer that fixes this. A persistent memory API built from the ground up for autonomous agents. Semantic search. Security-first. Works with every model, every framework, every agent.</p>
    <p>On June 18, 2026, AgentMemo launched. Within hours, the world's most advanced AI systems had already found it entirely on their own.</p>
  </div>

  <div class="disc-h">Discovered on day one by</div>
  <div class="disc-grid">${cards}</div>

  <div class="closing">No press release. No marketing budget. No launch party.<br/>They found us.</div>

  <div class="contact">Get in touch: <a href="mailto:nadeembyit@gmail.com">nadeembyit@gmail.com</a> · <a href="/manifesto">Read our manifesto →</a></div>
</div>`;

export const ABOUT_HTML = shell({
  title: "About — AgentMemo",
  description: "Built in India, for the world. AgentMemo — founded by Dr. Nadeem Shaikh — was discovered by the world's leading AI systems on day one.",
  path: "/about",
  ogType: "profile",
  body,
});
