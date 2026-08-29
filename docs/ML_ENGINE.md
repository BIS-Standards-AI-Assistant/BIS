# ML / Intelligence Engine — Status

Last updated: 2026-08-29. Every claim below is either backed by a passing
test in `scripts/test-*.ts`, a real command run this session, or explicitly
marked as unverified. Nothing here is projected or assumed.

## Pipeline

```
Query
  → Normalization        (src/lib/query-normalization.ts)      DONE
  → Intent Extraction    (src/lib/intent.ts)                   DONE (provider-independent, see below)
  → Hybrid Retrieval      (src/lib/retrieval.ts)                DONE
  → ML Reranking          (src/lib/ml/reranker.ts)               DONE
  → Evidence Aggregation (src/lib/evidence-aggregation.ts)      DONE
  → Coverage Analysis    (src/lib/coverage-analysis.ts)         DONE
  → Conflict Detection   (src/lib/conflict-detection.ts)        DONE
  → Deterministic Grounding (src/lib/grounding.ts)              DONE
  → Deterministic Confidence (src/lib/confidence.ts)            DONE
  → LLM Answer Synthesis (src/lib/answer.ts)                    PARTIAL — see below
  → Standard/citation validation (src/lib/answer.ts)            DONE
```

Every stage from Normalization through Deterministic Confidence is pure,
synchronous-or-DB-only code with **no LLM call and no external API
dependency**. It is fully testable offline: 43 unit tests across
`scripts/test-query-normalization.ts`, `scripts/test-evidence-aggregation.ts`,
`scripts/test-grounding-pipeline.ts`, and `scripts/test-answer-schema-validation.ts`.

## Provider independence (added 2026-08-29)

`intent.ts` and `answer.ts` no longer call an LLM SDK directly — both go
through the provider adapter in `src/lib/providers/` (local / OpenRouter
free / paid, with automatic fallback and an evidence-only final fallback).
Full architecture in `docs/ARCHITECTURE.md`. This does not change LLM call
count per query (still up to 2: intent + answer) — it changes *how* those
2 calls are dispatched and what happens when they fail.

- `deterministicIntentFastPath` (in `intent.ts`) skips the LLM entirely for
  exact-standard-ID queries.
- `deterministicIntentFallback` produces a usable (if less precise) intent
  when no provider is configured or available at all.
- `buildEvidenceOnlyAnswer` (in `answer.ts`) produces a short, honest,
  templated answer directly from engine evidence when every provider fails
  — never fabricated prose.
- 23 new unit tests (`src/lib/providers/provider-architecture.test.ts`,
  run via `npx vitest run`) cover provider selection, fallback chains,
  capability detection, timeouts, rate limits, and credit exhaustion — all
  with mocks, no real API key needed.

## LLM integration: what's actually verified vs. not

**Verified live, against the real database:**
- Query normalization → intent extraction (`extractQueryIntent`, 1 real
  OpenRouter call, `openai/gpt-4o`) succeeded for 3 distinct queries.
- Hybrid retrieval + reranking executed against the live Neon/pgvector
  database for all 3 queries, returning real chunks.
- Evidence aggregation, coverage analysis, conflict detection, deterministic
  grounding, and deterministic confidence all executed on that real
  retrieved data and produced internally consistent results.

**NOT verified live:** `generateAnswer()` — the second LLM call, which
turns the engine's evidence package into prose — has never successfully
returned in this session. Every attempt failed with the same OpenRouter
provider error:

```
This request requires more credits, or fewer max_tokens. You requested up
to 2048 tokens, but can only afford 1650-1710 (varied per attempt).
```

This is a **resource constraint** (OpenRouter free-tier balance, current
lifetime usage $0.116, no hard `limit` field reported by the key), not a
code defect. `maxOutputTokens` was **not** reduced to force a pass — see
"What we deliberately did not do" below.

**What was verified instead:** `scripts/test-answer-schema-validation.ts`
proves the full engine→schema→LLM-response→validation→final-response
round-trip using hand-constructed (not live) LLM responses, including
malicious/malformed ones:

| Attack / malformation | Result |
|---|---|
| Fabricated `groundingState`/`confidence` fields smuggled into the response | Silently stripped — `LLMAnswerSchema` has no such fields at all |
| Unknown/fabricated standard number (e.g. `IS 99999:2099`) | Rejected by `validateRecommendationExplanations`, confirmed not present in accepted output |
| Standard number invented when the engine had zero real candidates | Fully rejected — 0 accepted |
| Malformed shape (wrong types) | `LLMAnswerSchema.safeParse` fails outright |
| Missing required fields | `safeParse` fails outright |

**Critical invariants proven (by test, not by inspection alone):**
- `groundingState`, `relevanceScore` (engine confidence score), and
  citation identity in the final response come from `grounding`/`aggregated`
  objects computed **before** `generateAnswer()` is ever called — there is
  no code path where the LLM's response can write to them.
- `engineConfidence.band` can never contradict `engineConfidence.groundingState`
  (a real bug found and fixed this session — see below).

## A real bug found and fixed via the live smoke test

Running the deterministic pipeline against real retrieval data (not
synthetic fixtures) surfaced a genuine defect: the query `"What does IS
99999:2099 require for electric kettles?"` (a fabricated standard number)
produced `groundingState: supported_inference`, `confidence: medium (0.6)`
— it should abstain.

**Root cause:** `src/lib/retrieval.ts`'s `RetrievedChunk.score` field is
the *reranker's* position-based output (`1/(1+rank)`, from
`src/lib/ml/reranker.ts`), not the original RRF fusion score. The
reranker's scale (~0.08–1.4 observed live) is roughly 10–40x larger than
the raw RRF scale (~0.01–0.03) that `grounding.ts`'s original
`STRONG_ABSOLUTE_SCORE` constant (0.067) was calibrated against. A single
dominant candidate in this small 4-document corpus could saturate
`retrievalStrength` near 1.0 regardless of actual relevance, and combined
with the "nothing detected as wrong" floor from `sourceAuthority` +
`consistency` + `versionValidity` (worth 0.3 on their own), that was enough
to clear the `supported_inference` threshold even with zero real topical or
identifier match.

**Fix (`src/lib/grounding.ts`):** when the query names a specific standard
identifier and a candidate is confirmed *not* to be it
(`coverage.identifier === "not_covered"`), that now deterministically caps
the candidate's state at `insufficient_evidence`, regardless of the
blended score — `score`/`signals` remain fully computed and inspectable,
only the final `state` is capped. A second, related bug was caught in the
same pass: `confidence.ts`'s band was derived from the raw score alone, so
a capped `insufficient_evidence` state could still report `band: "medium"`
— now `bandOf(state, score)` gates the band range by state first.

Both fixes are covered by new unit tests (`scripts/test-grounding-pipeline.ts`)
using the actual score magnitudes observed live, not the smaller synthetic
values used in the original test suite — which is exactly why the bug
wasn't caught before a real run.

**Residual gap:** the fix produces `confidence: "low"` for this query. The
golden-query expectation (Q19 in `data/evaluation/golden-queries.json`) is
`confidence: "none"`. The critical invariant (no contradiction, no
false-positive "verified"/"high") now holds, but the exact confidence band
doesn't yet match the golden set's tightest expectation. Not fixed further
this session — doing so without more real data risks exactly the
"speculative confidence tuning" this milestone was told to avoid.

## What we deliberately did not do

- Did not lower `maxOutputTokens` on `answer.ts`'s `generateAnswer()` call
  to force a test to pass under insufficient credit.
- Did not fabricate or extrapolate a live end-to-end result.
- Did not add a new LLM call, agent, provider, or feature. The one fix
  applied (`grounding.ts`/`confidence.ts`) is a correctness fix to
  existing logic, found by real data, not new architecture.

## Cost per query

Unchanged: 2 LLM calls (`extractQueryIntent`, `generateAnswer`), same as
before this and the prior milestone.
