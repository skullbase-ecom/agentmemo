/** Crypto helpers built on the Web Crypto API (available in Workers). */

const KEY_PREFIX = "am_sk"; // secret key prefix
const ID_PREFIX = "am_pk"; // public key id prefix

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomBase62(bytes: number): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let out = "";
  for (const byte of raw) out += alphabet[byte % alphabet.length];
  return out;
}

/** SHA-256 hex digest of a string. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

/** Mint a new API key. Returns the public id and the one-time plaintext secret. */
export function generateApiKey(): { id: string; secret: string } {
  const id = `${ID_PREFIX}_${randomBase62(16)}`;
  const secret = `${KEY_PREFIX}_${randomBase62(40)}`;
  return { id, secret };
}

/**
 * Constant-time string comparison to avoid timing side channels when
 * comparing secrets (e.g. the admin secret).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
