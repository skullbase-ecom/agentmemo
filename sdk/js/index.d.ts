// Type definitions for the AgentMemo SDK.

export interface AgentMemoOptions {
  baseUrl?: string;
}

export type Outcome = "success" | "failure" | "unknown";
export type ContextFormat = "anthropic" | "openai" | "raw";

export interface StoreParams {
  userId: string;
  agentId: string;
  content: string;
  metadata?: Record<string, unknown>;
  ttlSeconds?: number;
  tags?: string[];
  namespace?: string;
  importance?: number;
  outcome?: Outcome;
  detectConflicts?: boolean;
}

export interface RetrieveParams {
  userId: string;
  query: string;
  agentId?: string;
  limit?: number;
  namespace?: string;
  tags?: string[] | string;
  minImportance?: number;
}

export interface ForgetParams {
  id?: string;
  userId?: string;
  agentId?: string;
}

export interface ContextParams {
  userId: string;
  agentId?: string;
  maxTokens?: number;
  format?: ContextFormat;
}

export interface FeedbackParams {
  memoryId: string;
  outcome: "success" | "failure";
  confidence?: number;
}

export interface StatsParams {
  userId?: string;
}

export interface StoreResponse {
  id: string;
  status: string;
  category?: string;
  trust_score?: number;
  contradiction?: unknown;
  expires_at?: number | null;
  [k: string]: unknown;
}

export interface RetrieveResponse {
  query: string;
  semantic: boolean;
  count: number;
  results: Array<{ id: string; content: string; score: number | null; final_score?: number | null; [k: string]: unknown }>;
}

export interface ContextResponse {
  context: string;
  token_count: number;
  memories_used: number;
  tokens_saved: number;
  formatted: { anthropic: string; openai: string; raw: string };
}

export class AgentMemoError extends Error {
  status: number;
  code?: string;
  body?: unknown;
}

export class AgentMemo {
  constructor(apiKey: string, opts?: AgentMemoOptions);
  store(params: StoreParams): Promise<StoreResponse>;
  retrieve(params: RetrieveParams): Promise<RetrieveResponse>;
  forget(params?: ForgetParams): Promise<{ deleted: number }>;
  context(params: ContextParams): Promise<ContextResponse>;
  feedback(params: FeedbackParams): Promise<{ memory_id: string; outcome: string; outcome_score: number }>;
  batch(memories: StoreParams[]): Promise<{ stored: number; skipped: number; duplicates_skipped: number; ids: string[] }>;
  stats(params?: StatsParams): Promise<Record<string, unknown>>;
  usage(): Promise<Record<string, unknown>>;
  static signup(name: string, baseUrl?: string): Promise<{ api_key: string; [k: string]: unknown }>;
}

export default AgentMemo;
