import { HTTPException } from "hono/http-exception";

/** Throw a 4xx with a structured JSON body. */
const CODE_BY_STATUS: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  402: "payment_required",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  429: "rate_limited",
};

/**
 * Throw a 4xx with the standard error shape: { error, code, docs }.
 * `code` is derived from the status (or pass an explicit one).
 */
export function fail(
  status: 400 | 401 | 402 | 403 | 404 | 409 | 429,
  message: string,
  code?: string,
): never {
  throw new HTTPException(status, {
    res: new Response(
      JSON.stringify({
        error: message,
        code: code ?? CODE_BY_STATUS[status] ?? "error",
        docs: "https://agentmemo.dev/docs",
      }),
      { status, headers: { "content-type": "application/json" } },
    ),
  });
}

/** Validate that a value is a non-empty string, else fail with 400. */
export function requireString(value: unknown, field: string, max = 100_000): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(400, `'${field}' is required and must be a non-empty string`);
  }
  if ((value as string).length > max) {
    fail(400, `'${field}' exceeds maximum length of ${max} characters`);
  }
  return value as string;
}

/** Parse an optional positive integer query param with a default and cap. */
export function parseLimit(raw: string | undefined, fallback: number, max: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return Math.min(n, max);
}
