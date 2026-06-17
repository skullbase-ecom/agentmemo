import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import type { Env, Variables } from "./types";
import { apiKeyAuth } from "./middleware/auth";
import { trackUsage, stripInternalHeaders } from "./middleware/usage";
import memory from "./routes/memory";
import auth from "./routes/auth";
import usage from "./routes/usage";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  }),
);

// ---- Public routes -------------------------------------------------------
app.get("/", (c) =>
  c.json({
    name: "AgentMemo",
    description: "Agent Memory API — store, semantically retrieve, and forget agent memories.",
    version: "1.0.0",
    endpoints: {
      "POST /auth/keys": "mint a developer API key (admin only)",
      "POST /memory/store": "store an agent memory",
      "GET /memory/retrieve": "semantic search over memories",
      "DELETE /memory/forget": "delete memories",
      "GET /usage": "usage stats for the calling key",
    },
  }),
);

app.get("/health", async (c) => {
  // Lightweight liveness + D1 connectivity check.
  let db = "ok";
  try {
    await c.env.DB.prepare("SELECT 1").first();
  } catch {
    db = "error";
  }
  return c.json({ status: db === "ok" ? "healthy" : "degraded", db }, db === "ok" ? 200 : 503);
});

// Admin-gated key minting (uses ADMIN_SECRET, not an API key).
app.route("/auth", auth);

// ---- Protected routes ----------------------------------------------------
// Order: strip internal headers (outer) -> record usage -> authenticate -> handler.
const protect = [stripInternalHeaders, trackUsage, apiKeyAuth] as const;

app.use("/memory/*", ...protect);
app.use("/usage", ...protect);
app.use("/usage/*", ...protect);

app.route("/memory", memory);
app.route("/usage", usage);

// ---- Error handling ------------------------------------------------------
app.notFound((c) => c.json({ error: { status: 404, message: "not found" } }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error("unhandled error", err);
  return c.json({ error: { status: 500, message: "internal server error" } }, 500);
});

export default app;
