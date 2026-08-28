import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Minimal provider indirection (not a router, not a fallback chain).
 *
 * Default backend is the Vercel AI Gateway — the "ai" package resolves a
 * bare model-id string like "anthropic/claude-sonnet-5" through it
 * automatically, with zero code here. That's been blocked all session on
 * `customer_verification_required` at the team-billing level (confirmed via
 * the OIDC token's team_id + a direct gateway call, not guessed).
 *
 * When OPENROUTER_API_KEY is set, every call site below routes through
 * OpenRouter instead. Embeddings use the identical model id
 * ("openai/text-embedding-3-small" — verified 1536-dim, so the pgvector
 * schema needs no migration). Chat does NOT reuse the Gateway's Claude
 * model id: a real test of anthropic/claude-sonnet-5 on this OpenRouter
 * account routes through "Amazon Bedrock", which *claims*
 * response_format/json_schema support in its capability metadata but
 * silently ignores it — every generateObject call came back as
 * markdown-fenced prose with fabricated IS numbers instead of the
 * requested schema (confirmed with raw fetch calls, bypassing the SDK
 * entirely, and confirmed `order: ["anthropic"]` has no direct-Anthropic
 * endpoint on this account either — "No endpoints found"). openai/gpt-4o
 * was verified with the same raw-fetch test to return clean, schema-exact
 * JSON, so that's the chat model whenever OpenRouter is the active
 * backend; the Gateway path keeps the original Claude model id since that
 * combination was never actually tested (blocked on billing all session).
 *
 * This is the whole abstraction: two functions, one conditional. If a third
 * backend is ever needed, that's the point to reconsider — not before.
 */
const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
  : null;

export const activeProvider = openrouter ? "openrouter" : "vercel-ai-gateway";

export const CHAT_MODEL_ID = openrouter ? "openai/gpt-4o" : "anthropic/claude-sonnet-5";
export const EMBEDDING_MODEL_ID = "openai/text-embedding-3-small";

export function chatModel(id: string = CHAT_MODEL_ID) {
  // No provider routing restrictions: `require_parameters: true` combined
  // with this account's data-policy settings excluded every endpoint
  // outright ("No endpoints available matching your guardrail
  // restrictions"). openai/gpt-4o was verified via a raw, unrestricted
  // request to return clean schema-exact JSON, so no restriction is needed.
  return openrouter ? openrouter.chat(id) : id;
}

export function embeddingModel(id: string = EMBEDDING_MODEL_ID) {
  return openrouter ? openrouter.embedding(id) : id;
}
