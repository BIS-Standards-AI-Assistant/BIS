import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Embeddings-only provider indirection. Chat/LLM provider selection now
 * lives in src/lib/providers/ (the provider-independent adapter + fallback
 * router used by intent.ts and answer.ts) — see docs/ARCHITECTURE.md. This
 * file is intentionally narrow: embeddings are a separate concern (fixed
 * model, no fallback chain needed since retrieval degrades to
 * keyword-only search if embedding fails — see src/lib/retrieval.ts).
 *
 * Default backend is the Vercel AI Gateway — the "ai" package resolves a
 * bare model-id string automatically, with zero code here. That's been
 * blocked all session on `customer_verification_required` at the
 * team-billing level. When OPENROUTER_API_KEY is set, embeddings route
 * through OpenRouter instead ("openai/text-embedding-3-small" — verified
 * 1536-dim, so the pgvector schema needs no migration).
 */
const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
  : null;

export const activeProvider = openrouter ? "openrouter" : "vercel-ai-gateway";

export const EMBEDDING_MODEL_ID = "openai/text-embedding-3-small";

export function embeddingModel(id: string = EMBEDDING_MODEL_ID) {
  return openrouter ? openrouter.embedding(id) : id;
}
