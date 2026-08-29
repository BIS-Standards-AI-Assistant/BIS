# Evaluation — Status

Last updated: 2026-08-29. See also `data/evaluation/GENERATION_BASELINE.md`
for the pre-existing generation-layer baseline (7/20 golden queries tested
before this session, blocked by credit beyond that).

## Deterministic-layer tests (no DB, no LLM — run anytime, free)

| Suite | Tests | Result |
|---|---|---|
| `scripts/test-query-normalization.ts` | 8 | 8/8 PASS |
| `scripts/test-evidence-aggregation.ts` | 7 | 7/7 PASS |
| `scripts/test-grounding-pipeline.ts` | 20 | 20/20 PASS |
| `scripts/test-answer-schema-validation.ts` | 10 | 10/10 PASS |
| **Total** | **45** | **45/45 PASS** |

Run any of them with `npx tsx scripts/test-<name>.ts`.

## Retrieval/reranker regression (live DB, no LLM)

`npx dotenv-cli -e .env.local -- npx tsx scripts/eval-reranker.ts`

| Metric | Baseline (no-op reranker) | Document-diversity reranker |
|---|---|---|
| Recall (expected standard in top 5) | 12/12 | 12/12 |
| No-false-identifier-match | 8/8 | 8/8 |
| Q17 specifically | PASS | PASS |

No regression from restoring the reranker wiring this session (it had been
reverted by an unrelated merge, then restored as part of this milestone).

## Live end-to-end smoke test (real OpenRouter calls)

Run via `scripts/smoke-test-pipeline.ts`. 3 queries, chosen per the
milestone's guidance (one exact ID, one natural-language, one
out-of-corpus/negative):

| # | Query | Category | Stages 1-8 (deterministic) | Stage 9 (LLM answer) |
|---|---|---|---|---|
| 1 | `IS 5522:2014` | exact_identifier | ALL PASS — grounding=verified, confidence=high(1.0) | FAILED — OpenRouter credit (needed 2048 tokens, had 1679) |
| 2 | `What standard covers stainless steel sheets used for utensils?` | natural_language | ALL PASS — grounding=verified, confidence=high(0.92) | FAILED — OpenRouter credit (needed 2048, had 1650) |
| 3 | `What does IS 99999:2099 require for electric kettles?` | hallucination_trap (~Q19) | ALL PASS — grounding=insufficient_evidence (all 3 candidates), confidence=low(0.6) *after a bug fix mid-session, see docs/ML_ENGINE.md* | FAILED — OpenRouter credit (needed 2048, had 1650) |

**LLM integration remains unverified in live production execution.** This
is a resource constraint (OpenRouter free-tier balance exhausted), not a
regression. It was not worked around by reducing token limits.

## Confidence calibration

`npx tsx scripts/calibrate-confidence.ts` — reports, correctly:

> calibration data insufficient: only 7 query result(s) with a real
> generation run (need at least 20)

No calibration curve is claimed. This is by design (see the milestone's
"do not fake it" requirement) — `data/evaluation/validation-results.json`
currently has 7 real generation runs, all from before this session.

## What has NOT been measured this session

- Coverage accuracy, hallucination/fabrication rate, and abstention
  correctness against the full golden set — all require live LLM runs
  that credit exhaustion blocked.
- Any live run of `generateAnswer()`'s new reduced schema against a real
  model response (only proven via schema tests with hand-constructed
  responses, per `docs/ML_ENGINE.md`).
- Latency/token cost of the new `answer.ts` prompt vs. the old one — no
  successful call to measure against.

## Golden-query dataset

`data/evaluation/golden-queries.json`, 20 queries, unchanged this session.
`data/evaluation/GENERATION_BASELINE.md` documents the pre-existing 7/20
generation-layer baseline; it was not re-run this session (would require
the same credit this session didn't have).
