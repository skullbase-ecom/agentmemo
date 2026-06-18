// OAuth-style discovery metadata for agent registration, referenced by auth.md.
//   GET /.well-known/oauth-protected-resource     (RFC 9728 — Protected Resource Metadata)
//   GET /.well-known/oauth-authorization-server   (RFC 8414 + auth.md agent_auth block)
//
// AgentMemo issues long-lived API keys rather than running a full OAuth token
// endpoint, so the `agent_auth` block advertises an api_key registration profile:
// self-serve registration at /signup that returns a bearer key directly.

const BASE = "https://agentmemo.dev";

export const PROTECTED_RESOURCE_METADATA = {
  resource: `${BASE}/`,
  resource_name: "AgentMemo",
  resource_documentation: `${BASE}/docs`,
  authorization_servers: [`${BASE}/`],
  scopes_supported: ["read", "write"],
  bearer_methods_supported: ["header"],
} as const;

export const AUTHORIZATION_SERVER_METADATA = {
  // RFC 8414 standard fields
  issuer: BASE,
  resource: `${BASE}/`,
  authorization_servers: [`${BASE}/`],
  scopes_supported: ["read", "write"],
  bearer_methods_supported: ["header"],
  registration_endpoint: `${BASE}/signup`,
  service_documentation: `${BASE}/docs`,
  token_endpoint_auth_methods_supported: ["none"],

  // auth.md agent-registration profile (api_key variant)
  agent_auth: {
    profile: "api_key",
    skill: `${BASE}/auth.md`,
    registration_endpoint: `${BASE}/signup`,
    privileged_registration_endpoint: `${BASE}/auth/keys`,
    identity_types_supported: ["self_serve_email"],
    credential_type: "bearer_api_key",
    credential_prefix: "am_sk_",
    scopes_supported: ["read", "write"],
    self_serve: true,
    notes:
      "Self-serve registration: POST /signup with { name, email } returns a free-tier bearer API key (am_sk_...) immediately. Present it as 'Authorization: Bearer'. No token exchange or claim ceremony is required.",
  },
} as const;
