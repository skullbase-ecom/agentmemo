// Changelog page on the shared design system.
import { shell } from "./ui";

interface ChangelogEntry {
  date: string;
  title: string;
  body: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "June 19, 2026",
    title: "Intelligence layer, security & SDKs",
    body: "Memory graph + contradiction detection, compression, import/export, agent identity, /memory/context for LLM injection, batch/feedback/stats, OWASP ASI06 trust scoring + audit, OpenAPI + agent-readiness discovery, JS/Python SDKs, and a full UI redesign.",
  },
  {
    date: "June 18, 2026",
    title: "Memory types & free unlimited beta",
    body: "Five memory types (semantic, episodic, procedural, working, emotional), embedding cache, a public Observatory. Usage is free and unlimited during the public beta.",
  },
  {
    date: "June 18, 2026",
    title: "AgentMemo launches",
    body: "Persistent memory API for AI agents. Semantic search, MCP server, agent self-registration via POST /signup.",
  },
];

const STYLE = `<style>
.ch{padding:60px 0 90px;max-width:760px;margin:0 auto}
.ch h1{font-size:2.6rem;font-weight:800}
.ch .lede{color:var(--text-2);margin:8px 0 44px}
.entry{display:grid;grid-template-columns:150px 1fr;gap:24px}
.entry .date{color:var(--text-muted);font-size:14px;padding-top:24px}
.entry .card{margin-bottom:22px}
.entry h3{font-size:18px;margin-bottom:8px}.entry p{color:var(--text-2);font-size:14.5px}
@media(max-width:640px){.entry{grid-template-columns:1fr;gap:6px}.entry .date{padding-top:0}}
</style>`;

const entries = CHANGELOG.map(
  (e) => `<div class="entry"><div class="date">${e.date}</div><div class="card"><h3>${e.title}</h3><p>${e.body}</p></div></div>`,
).join("");

export const CHANGELOG_HTML = shell({
  title: "Changelog — AgentMemo",
  description: "What's new in AgentMemo — the persistent memory API for AI agents.",
  path: "/changelog",
  body: `${STYLE}<div class="ch wrap"><h1>Change<span class="accent-text">log</span></h1><p class="lede">What's new in AgentMemo.</p>${entries}</div>`,
});
