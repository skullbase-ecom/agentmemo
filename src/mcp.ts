// Model Context Protocol (MCP) server. Lets MCP-capable agents (Claude, Cursor,
// etc.) discover and call AgentMemo natively.
//   GET  /mcp.json  — discovery manifest
//   POST /mcp       — JSON-RPC 2.0 endpoint (Streamable HTTP transport)
//
// Tools (store_memory, retrieve_memory, forget_memory, get_usage) are executed
// by dispatching to AgentMemo's own REST routes, so auth, rate limits, and the
// free-tier quota all apply uniformly. The MCP client authenticates by sending
// its AgentMemo API key as `Authorization: Bearer am_sk_...` on POST /mcp.

const SERVER_VERSION = "1.0.0";
const DEFAULT_PROTOCOL = "2025-06-18";

export const MCP_TOOLS = [
  {
    name: "store_memory",
    description:
      "Store a memory for a user/agent. The content is embedded automatically and becomes semantically searchable.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "End-user this memory belongs to." },
        agent_id: { type: "string", description: "Agent that owns the memory." },
        content: { type: "string", description: "The memory text to remember." },
        metadata: { type: "object", description: "Optional arbitrary JSON metadata." },
      },
      required: ["user_id", "agent_id", "content"],
    },
  },
  {
    name: "retrieve_memory",
    description:
      "Semantically search a user's memories and return the most relevant ones, ranked by similarity.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "User whose memories to search." },
        query: { type: "string", description: "Natural-language search query." },
        agent_id: { type: "string", description: "Optional: narrow to one agent." },
        limit: { type: "integer", description: "Max results (default 10, max 100)." },
      },
      required: ["user_id", "query"],
    },
  },
  {
    name: "forget_memory",
    description: "Delete a specific memory by id, or all memories for a user (optionally an agent).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Specific memory id to delete." },
        user_id: { type: "string", description: "Delete all memories for this user." },
        agent_id: { type: "string", description: "With user_id, limit to one agent." },
      },
    },
  },
  {
    name: "get_usage",
    description: "Get usage for the calling API key: operations used this month, tier, and limit.",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

export const MCP_MANIFEST = {
  name: "agentmemo",
  description: "Persistent memory for AI agents — store, semantically retrieve, and forget memories.",
  version: SERVER_VERSION,
  protocolVersion: DEFAULT_PROTOCOL,
  transport: "streamable-http",
  endpoint: "https://agentmemo.dev/mcp",
  authentication: {
    type: "http",
    scheme: "bearer",
    description: "Send your AgentMemo API key as 'Authorization: Bearer am_sk_...'.",
    obtain_key: "https://agentmemo.dev/signup",
  },
  tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  documentation: "https://agentmemo.dev/docs",
} as const;

/** A function that dispatches an internal REST call (auth header is forwarded by the caller). */
export type ApiCaller = (req: {
  method: string;
  path: string;
  body?: unknown;
}) => Promise<{ status: number; json: unknown }>;

interface JsonRpc {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function runTool(name: string, args: Record<string, unknown>, call: ApiCaller) {
  switch (name) {
    case "store_memory":
      return call({ method: "POST", path: "/memory/store", body: args });
    case "retrieve_memory": {
      const q = new URLSearchParams();
      if (args.user_id != null) q.set("user_id", String(args.user_id));
      if (args.query != null) q.set("q", String(args.query));
      if (args.agent_id != null) q.set("agent_id", String(args.agent_id));
      if (args.limit != null) q.set("limit", String(args.limit));
      return call({ method: "GET", path: `/memory/retrieve?${q}` });
    }
    case "forget_memory": {
      const q = new URLSearchParams();
      if (args.id != null) q.set("id", String(args.id));
      if (args.user_id != null) q.set("user_id", String(args.user_id));
      if (args.agent_id != null) q.set("agent_id", String(args.agent_id));
      return call({ method: "DELETE", path: `/memory/forget?${q}` });
    }
    case "get_usage":
      return call({ method: "GET", path: "/usage" });
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

/**
 * Handle one JSON-RPC message. Returns the response object, or null for
 * notifications (no response expected).
 */
export async function handleMcpRpc(msg: JsonRpc, call: ApiCaller): Promise<object | null> {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize": {
      const clientProtocol = (params?.protocolVersion as string) || DEFAULT_PROTOCOL;
      return rpcResult(id, {
        protocolVersion: clientProtocol,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "agentmemo", version: SERVER_VERSION },
        instructions:
          "AgentMemo gives agents persistent memory. Use store_memory to remember facts, retrieve_memory to recall them semantically, forget_memory to delete, and get_usage to check quota.",
      });
    }
    case "tools/list":
      return rpcResult(id, { tools: MCP_TOOLS });
    case "tools/call": {
      const name = params?.name as string;
      const args = (params?.arguments as Record<string, unknown>) || {};
      try {
        const { status, json } = await runTool(name, args, call);
        const isError = status < 200 || status >= 300;
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(json, null, 2) }],
          isError,
        });
      } catch (err) {
        return rpcResult(id, {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        });
      }
    }
    case "ping":
      return rpcResult(id, {});
    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notification — no response
    default:
      if (id === undefined) return null; // unknown notification
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}
