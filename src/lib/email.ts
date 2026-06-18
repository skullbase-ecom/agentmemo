import type { Env } from "../types";

// Transactional email via the Resend API. Best-effort: if RESEND_API_KEY is not
// configured (or the call fails), we log and continue — signup must never fail
// because email delivery did.

export async function sendWelcomeEmail(
  env: Env,
  to: string,
  apiKey: string,
  name: string,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping welcome email");
    return false;
  }
  const sender = env.RESEND_SENDER || env.RESEND_FROM || "hello@agentmemo.dev";
  const from = sender.includes("<") ? sender : `AgentMemo <${sender}>`;
  const quickstart = `curl -X POST https://agentmemo.dev/memory/store \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"user_id":"u1","agent_id":"a1","content":"Remember this."}'`;

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#07080d;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e7e9f0;padding:32px">
<div style="max-width:520px;margin:0 auto;background:#11131d;border:1px solid #1f2330;border-radius:16px;padding:32px">
  <div style="font-size:20px;font-weight:700">🧠 AgentMemo</div>
  <h1 style="font-size:24px;margin:20px 0 8px">Welcome${name ? ", " + escapeHtml(name) : ""}!</h1>
  <p style="color:#9097a8;line-height:1.6">Your AgentMemo API key is ready. Give your AI agents persistent memory with two lines of code.</p>
  <p style="color:#9097a8;margin-top:20px;font-size:14px">Your API key (store it securely — it is shown only here):</p>
  <div style="background:#0a0c13;border:1px solid #1f2330;border-radius:10px;padding:14px;font-family:monospace;font-size:14px;color:#2dd4a7;word-break:break-all">${escapeHtml(apiKey)}</div>
  <p style="color:#9097a8;margin-top:24px;font-size:14px">Quickstart — store your first memory:</p>
  <pre style="background:#0a0c13;border:1px solid #1f2330;border-radius:10px;padding:14px;font-family:monospace;font-size:12px;color:#cdd3e0;white-space:pre-wrap;word-break:break-all;overflow-x:auto">${escapeHtml(quickstart)}</pre>
  <p style="margin-top:28px"><a href="https://agentmemo.dev/docs" style="color:#19c2d6">Read the docs →</a></p>
  <p style="color:#6b7280;font-size:13px;margin-top:24px">Free tier: 10,000 operations / month. Upgrade to Pro for unlimited.</p>
</div></body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your AgentMemo API key",
        html,
      }),
    });
    if (!res.ok) {
      console.error("resend send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("resend send error", String(err));
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === '"' ? "&quot;" : "&#39;",
  );
}
