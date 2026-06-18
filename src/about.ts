// About / founder page on the shared design system.
import { shell } from "./ui";
import { FOUNDER_IMG } from "./founder-image";

const STYLE = `<style>
.ab{padding:64px 0 90px;max-width:720px;margin:0 auto;text-align:center}
.ab .eyebrow{display:block}
.portrait{width:150px;height:150px;object-fit:cover;border-radius:50%;border:1px solid var(--border);margin:22px auto 20px;display:block;filter:grayscale(100%);box-shadow:0 24px 60px -30px rgba(0,0,0,.9)}
.ab h1{font-size:clamp(2rem,5vw,3rem);font-weight:800}
.ab .role{color:var(--text-2);margin-top:8px}
.quote{font-size:clamp(22px,4vw,30px);font-weight:700;letter-spacing:-.02em;color:var(--text);border-left:3px solid var(--accent);padding-left:20px;margin:40px 0;text-align:left}
.bio{text-align:left;color:var(--text-2);font-size:17px;line-height:1.8}.bio p{margin:18px 0}
.bio .accent-text{font-weight:600}
.loc{color:var(--text-muted);font-size:14px;margin-top:28px}
</style>`;

const body = `${STYLE}<div class="ab wrap">
  <span class="eyebrow">About the founder</span>
  <img class="portrait" src="${FOUNDER_IMG}" alt="Dr. Nadeem Shaikh, founder of AgentMemo" width="150" height="150"/>
  <h1>Dr. Nadeem <span class="accent-text">Shaikh</span></h1>
  <p class="role"><b style="color:var(--text)">Founder</b>, AgentMemo</p>

  <div class="quote">Every agent needs a memory.</div>

  <div class="bio">
    <p>Dr. Nadeem Shaikh is the founder of AgentMemo, a memory infrastructure platform built for the age of autonomous AI agents.</p>
    <p>As AI agents multiply across industries — writing code, managing workflows, serving customers, and making decisions — they face a fundamental problem: every session starts from zero. No memory of past interactions. No context. No continuity. AgentMemo solves this at infrastructure level, giving agents the ability to store, search, and recall information across millions of interactions in milliseconds.</p>
    <p>Built for scale from day one, AgentMemo is designed to serve millions of agents simultaneously — running 24/7, globally distributed, with sub-100ms response times. Developers integrate in minutes with two lines of code. Agents retrieve semantically relevant memories instantly, regardless of how much time has passed.</p>
    <p>Nadeem built AgentMemo because he believes the next generation of software won't be used by humans — it will be run by agents. And <span class="accent-text">every agent needs a memory.</span></p>
  </div>

  <p class="loc">Built in Nanded, Maharashtra, India 🇮🇳 — for the world.</p>
  <div style="margin-top:28px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
    <a class="btn btn-primary" href="/signup">Get your API key</a>
    <a class="btn btn-ghost" href="/manifesto">Read the manifesto</a>
  </div>
</div>`;

export const ABOUT_HTML = shell({
  title: "About — AgentMemo",
  description: "AgentMemo is memory infrastructure for the age of autonomous AI agents. Founded by Dr. Nadeem Shaikh, Nanded, India.",
  path: "/about",
  ogType: "profile",
  body,
});
