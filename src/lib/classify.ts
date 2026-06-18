import type { Env } from "../types";

// Classify memory content into broad, anonymized categories for the Observatory.
// Tries Workers AI (zero-shot); falls back to a keyword heuristic so the
// Observatory always returns a distribution even if the model is unavailable.

export const CATEGORIES = [
  "preferences",
  "people",
  "tasks",
  "events",
  "technical",
  "commerce",
  "location",
  "health",
  "facts",
  "other",
] as const;

type Category = (typeof CATEGORIES)[number];

const KEYWORDS: Record<Category, string[]> = {
  preferences: ["prefer", "likes", "like ", "loves", "hates", "favorite", "favourite", "wants", "enjoys"],
  people: ["friend", "colleague", "manager", "family", "contact", "spouse", "team", "their name"],
  tasks: ["task", "todo", "to-do", "need to", "should", "deadline", "follow up", "follow-up", "remind"],
  events: ["meeting", "scheduled", "appointment", "event", "happened", "yesterday", "tomorrow", "on monday"],
  technical: ["code", "api", "bug", "deploy", "server", "database", "function", "error", "endpoint", "repo"],
  commerce: ["order", "purchase", "plan", "subscription", "payment", "price", "bought", "cancel", "invoice", "refund"],
  location: ["lives in", "located", "city", "country", "address", "based in", "from "],
  health: ["allerg", "diet", "vegetarian", "vegan", "medical", "health", "doctor", "medication"],
  facts: ["is a", "is the", "was ", "are ", "born", "works at", "founded"],
  other: [],
};

/** Fast single-item classification (heuristic, no AI) for the store hot path. */
export function classifyOne(content: string): string {
  return heuristic(content);
}

function heuristic(content: string): Category {
  const t = content.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat === "other" || cat === "facts") continue;
    if (KEYWORDS[cat].some((k) => t.includes(k))) return cat;
  }
  if (KEYWORDS.facts.some((k) => t.includes(k))) return "facts";
  return "other";
}

function emptyDist(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
}

/** Classify a sample of memory contents into a category distribution. */
export async function classifySample(env: Env, contents: string[]): Promise<Record<string, number>> {
  const dist = emptyDist();
  if (contents.length === 0) return dist;

  // Try one Workers AI call for the whole sample.
  try {
    const numbered = contents.map((c, i) => `${i + 1}. ${c.slice(0, 200)}`).join("\n");
    const res = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as keyof AiModels, {
      messages: [
        {
          role: "system",
          content:
            `Classify each numbered memory into exactly one category from this list: ${CATEGORIES.join(", ")}. ` +
            `Reply ONLY with a JSON array of lowercase category strings, one per item, in order. No prose.`,
        },
        { role: "user", content: numbered },
      ],
      max_tokens: 512,
    })) as { response?: string };

    const match = (res?.response ?? "").match(/\[[\s\S]*\]/);
    if (match) {
      const arr = JSON.parse(match[0]) as unknown[];
      if (Array.isArray(arr) && arr.length) {
        arr.forEach((v, i) => {
          if (i >= contents.length) return;
          const cat = (CATEGORIES as readonly string[]).includes(String(v)) ? (v as Category) : heuristic(contents[i]);
          dist[cat as Category]++;
        });
        return dist;
      }
    }
  } catch (err) {
    console.error("AI classify failed, using heuristic", String(err));
  }

  // Heuristic fallback.
  for (const c of contents) dist[heuristic(c)]++;
  return dist;
}
