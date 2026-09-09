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
| Local | `LocalProvider` | `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_MODEL`, `LOCAL_LLM_TIMEOUT_MS` (opt), `LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT` (opt) | Plain `fetch` to an OpenAI-compatible `/chat/completions` endpoint (Ollama, LM Studio, vLLM's OpenAI-compat server, etc.). No SDK dependency, no model name hardcoded. See "Local inference (Ollama)" below. |
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

## Local inference (Ollama)

The `local` tier is the zero-cost floor of the architecture: with Ollama
running and a model pulled, the app needs no API key and no network beyond
Postgres.

**Configuration** (host or Docker — same code, config only):

| Env var | Host default | Docker (`local` profile) |
|---|---|---|
| `LOCAL_LLM_BASE_URL` | `http://localhost:11434/v1` | `http://ollama:11434/v1` |
| `LOCAL_LLM_MODEL` | `llama3.2:3b` (documented default; override freely) | same |
| `LOCAL_LLM_TIMEOUT_MS` | `15000` | `15000` |
| `LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT` | unset → `false` | unset → `false` |

The base URL is the OpenAI-compat root and **must end in `/v1`** for Ollama
— `LocalProvider` appends `/chat/completions`. The model is **not**
downloaded on startup; `ollama pull <model>` is a manual, documented step
(`docker compose --profile local exec ollama ollama pull llama3.2:3b`).

**Structured output.** `llama3.2:3b` reliably drives `generateText` (the
freeform-chat and translate-in calls) but is **not** verified for the
production intent/answer JSON schemas — `LocalProvider.generateStructured`
does a bare `JSON.parse` + `schema.parse`, and a small model's output
(prose prefixes, unfenced JSON, missing optional fields) fails that often
enough that it must not be trusted. So `structuredOutput` stays `false` by
default: the router skips `local` for structured calls and the
deterministic intent / evidence-only answer path handles them. Set
`LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT=true` only for a model/server *you*
have verified with `npm run ollama:smoke` (which exercises a real
structured round trip when the flag is set).

**Local inference is not a source of BIS truth.** Ollama synthesizes prose
from the same engine-produced evidence package every other provider gets.
It cannot choose candidates, invent citations, or set grounding/confidence
— the pipeline decides all of that before the provider is called, and
`LLMAnswerSchema` has no field for any of it (same as every other
provider).

**Error normalization.** `LocalProvider` maps failures to prefixed
messages so callers and `npm run ollama:smoke` can tell them apart:
`not_configured:`, `connection_failed:` (server down), `timeout:`,
`model_not_found:` (server up, model not pulled), `http_error:`,
`invalid_response:` (2xx but no usable completion), and
`schema_validation_failed:` (structured only). Each is surfaced as a
normal `NormalizedLLMResponse` with `error` set — never a thrown
exception — so fallback stays a plain data flow.

**Verification.** `npm run ollama:smoke` (`scripts/ollama-smoke.ts`)
checks reachability → model presence → a real `generateText` round trip
(→ structured too if opted in), prints latency, and exits non-zero on
failure. It is DB-independent. See `docs/PROJECT_STATUS.md` for the last
recorded live result.

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

- **Timeout**: `LocalProvider` uses an `AbortController` (default 15s,
  tunable via `LOCAL_LLM_TIMEOUT_MS` — a knob, not a silent bump). An
  abort is normalized to a `timeout:` error. OpenRouter/Groq/Gemini calls
  inherit the underlying SDK's own timeout behavior.
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

## Verification status

The provider architecture itself (routing, fallback, capability detection,
evidence-only fallback) is verified by unit tests using mocks — no real
API key or local server required (`npx vitest run src/lib/providers/`).

**Local (Ollama) — VERIFIED LIVE (2026-09-09).** `ollama` 0.33.3,
`llama3.2:3b`, on the host. `npm run ollama:smoke` passed (real
`generateText` ~3.5–4.6 s; a trivial-schema structured round trip also
passed). Full pipeline via `npm run smoke:prd` with `LLM_PROVIDER=local`:
Ollama served the Hindi translate-in call (`provider_succeeded`, ~3.2 s)
and — with `structuredOutput` off, as designed — intent/answer fell to the
deterministic / evidence-only path; grounding, refusal, and multilingual
behavior unchanged. Provider fallback verified end-to-end: a failing
primary (bad Gemini key) → Ollama success → (Ollama also down) → `null` →
evidence-only. With `LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT=true`,
`llama3.2:3b` failed the real intent schema (`schema_validation_failed`)
and the router correctly fell back — hence the default stays `false`. See
`docs/PROJECT_STATUS.md`.

A real **paid-tier** OpenRouter call still has not been exercised live.
