import type { Env } from "../types";

// Text generation via Workers AI (used for episode summaries, compression, and
// insights). Best-effort with a graceful fallback so a missing/failing model
// never breaks the calling endpoint.

const SUMMARY_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function summarize(env: Env, instruction: string, text: string): Promise<string> {
  const clipped = text.slice(0, 8000);
  try {
    const res = (await env.AI.run(SUMMARY_MODEL as keyof AiModels, {
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: clipped },
      ],
      max_tokens: 256,
    })) as { response?: string };
    const out = (res?.response ?? "").trim();
    if (out) return out;
  } catch (err) {
    console.error("summarize failed", String(err));
  }
  // Fallback: naive truncation.
  return clipped.length > 400 ? clipped.slice(0, 400) + "…" : clipped;
}
