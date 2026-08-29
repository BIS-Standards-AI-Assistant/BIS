# LLM Provider Architecture

Last updated: 2026-08-29. This is the source of truth for how the BIS
intelligence engine talks to language models — read this before touching
`src/lib/providers/`, `src/lib/intent.ts`, or `src/lib/answer.ts`.

## The core rule

**Paid LLM inference is optional and is not a dependency of the BIS
intelligence engine.** The application must never directly depend on a
specific LLM provider. Every model call goes through:

```
Application (intent.ts, answer.ts, API routes)
    ↓
Provider Adapter (src/lib/providers/router.ts)
    ↓
Provider implementation (LocalProvider | OpenRouterProvider)
    ↓
Normalized response (NormalizedLLMResponse)
```

`intent.ts` and `answer.ts` never import a provider SDK, never see a
provider-specific response shape, and never hardcode a model id or a
fallback order.

## Providers

| Tier | Class | Configuration | Notes |
|---|---|---|---|
| Local | `LocalProvider` | `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_MODEL` | Plain `fetch` to an OpenAI-compatible `/chat/completions` endpoint (Ollama, LM Studio, vLLM's OpenAI-compat server, etc.). No SDK dependency, no model name hardcoded. |
| OpenRouter free | `OpenRouterProvider("openrouter-free")` | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Uses the existing `@openrouter/ai-sdk-provider` + Vercel `ai` SDK. |
| Paid | `OpenRouterProvider("paid")` | `PAID_PROVIDER_API_KEY`, `PAID_PROVIDER_MODEL` | Same OpenRouter-compatible interface with different credentials/model — activates only when explicitly configured. |

Embeddings (`src/lib/embedding-provider.ts`) are a **separate, unaffected
concern** — fixed model, no fallback chain, because retrieval already
degrades to keyword-only search if embedding fails (see
`src/lib/retrieval.ts`).

## Routing policy

`LLM_PROVIDER` controls which providers are tried and in what order:

- `auto` (default): `local` → `openrouter-free` → `paid`
- `local` / `openrouter-free` / `paid`: pin to exactly that one provider
- `none`: always empty chain — forces every call to fall back to
  deterministic/evidence-only behavior

This ordering is **data** (`src/lib/providers/router.ts`'s
`resolveProviderChain`), not hardcoded into business logic — changing the
default priority is a one-line change in one place, not a hunt through
`intent.ts`/`answer.ts`.

## Capability detection

Every provider exposes `capabilities.structuredOutput`. **No model is
assumed to support structured JSON output by default.** `OpenRouterProvider`
only reports `true` for a small verified allowlist
(`openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-4-turbo` — verified this
session via direct raw-fetch tests against a real account). `LocalProvider`
defaults to `false` unless the operator explicitly sets
`LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT=true` for a model/server combination
they've verified themselves.

The router (`generateStructuredWithFallback`) skips any provider lacking
this capability before even attempting a call — see test scenario 9 in
`src/lib/providers/provider-architecture.test.ts`.

## Intent routing

```
Query
  → deterministic fast path (exact standard-ID query, nothing else meaningful)
      → confident? → QueryIntent directly, NO LLM CALL
  → provider adapter (structured generation)
      → success? → QueryIntent from the model
      → no provider available/capable? → deterministic fallback
          (keyword-based intent + certification/testing flags; product/
          material/useCase left null rather than guessed)
```

An LLM is never mandatory for a query to produce an intent. See
`src/lib/intent.ts`'s `deterministicIntentFastPath` and
`deterministicIntentFallback`.

## Answer routing

```
Engine evidence (grounding, confidence, coverage, conflicts — all already
computed deterministically before this point)
  → provider adapter (concise prose generation)
      → success? → validate standardNumbers against engine candidates → final answer
      → failure/unavailable? → evidence-only answer (buildEvidenceOnlyAnswer
          in src/lib/answer.ts) — a short, honest, templated explanation
          built directly from the evidence, never fabricated prose
```

**The LLM cannot become responsible for:** choosing which standards are
candidates, inventing citations, assigning `groundingState`, assigning
`confidence`, or overriding engine evidence. These are computed by the
deterministic pipeline (`src/lib/evidence-aggregation.ts` →
`coverage-analysis.ts` → `conflict-detection.ts` → `grounding.ts` →
`confidence.ts`) before the provider adapter is ever called, and the LLM's
response schema (`LLMAnswerSchema`) has no fields for any of them — see
`docs/ML_ENGINE.md`.

## Normalized response shape

```ts
interface NormalizedLLMResponse<T> {
  text: string | null;
  structuredData: T | null;
  provider: "local" | "openrouter-free" | "paid";
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  finishReason: "stop" | "length" | "error" | "unknown";
  error: string | null;
}
```

No provider-specific response object (an OpenAI/Ollama/Anthropic payload
shape) ever crosses this boundary into `intent.ts`/`answer.ts`.

## Observability

`src/lib/providers/router.ts` logs (via `console.log`, prefixed
`[llm-provider]`) on every attempt: provider name, model, latency, token
usage on success; provider name, model, latency, and error message on
failure; and a summary when every provider in the chain is exhausted.
**Never logged:** API keys, credentials, full prompt text, or user query
content.

## Cost control

- **Timeout**: `LocalProvider` uses an `AbortController` (default 15s).
  OpenRouter calls inherit the underlying SDK's own timeout behavior.
- **Retry limit = 0 per provider.** A failed call moves to the next
  provider rather than retrying the one that just failed — retrying an
  already-failed expensive call rarely helps (a rate limit or credit
  exhaustion doesn't resolve by asking again immediately) and risks
  doubling cost for nothing.
- **Cooldown**: a provider that just failed is skipped for 60 seconds on
  subsequent calls within the same process, so one flaky/exhausted
  provider isn't re-attempted (and re-failed) on every single query.
- **No infinite loops**: the chain is a fixed, finite list. If every
  provider fails or is unavailable, the result is `response: null` and the
  caller falls back to deterministic behavior — never a retry loop.

## Non-goals (explicitly out of scope)

No multi-agent architecture, no additional LLM call beyond the existing 2
per query (intent + answer), no new database, no replacement of pgvector or
the existing reranker, no speculative ML, no hardcoded model, and no
provider (local, OpenRouter, or paid) is ever made mandatory.

## What was NOT verified live

The provider architecture itself (routing, fallback, capability detection,
evidence-only fallback) is verified by 23 unit tests using mocks — no real
API key or local server required (`npx vitest run
src/lib/providers/provider-architecture.test.ts`). A real local Ollama
server and a real paid-tier OpenRouter call have **not** been tested this
session — only OpenRouter's free tier has ever been exercised live (see
`docs/ML_ENGINE.md`), and even that has been credit-exhausted for most of
this project's history.
