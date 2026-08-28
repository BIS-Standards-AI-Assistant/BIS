# Generation Baseline — BIS Standards Navigator

Measured, not projected. Every number below comes from either a real
`/api/v1/query` HTTP response or a direct Postgres lookup against the live
Neon database — see `scripts/eval-generation.ts` and
`scripts/validate-generation.ts`.

## Dataset

```
Queries:          20 (data/evaluation/golden-queries.json)
Categories:        exact_identifier, messy_identifier, part_section,
                    natural_language, ambiguous_product, unsupported_query,
                    evidence_question, comparison, certification, testing,
                    prompt_injection, hallucination_trap
Corpus:            4 real BIS documents, 142 chunks, 142 embeddings
Chat model:        openai/gpt-4o (via OpenRouter)
Embedding model:   openai/text-embedding-3-small (via OpenRouter)
```

## Trust dashboard

```
┌───────────────────────────────────────┐
│ BIS ENGINE EVALUATION                  │
├───────────────────────────────────────┤
│ Retrieval Recall@5        12/12        │
│ No-False-Match             8/8         │
│ Generation Tests           7/20        │
│   — from earlier this session   4      │
│   — run this milestone          3      │
│   — blocked by credit          13      │
│ Citation Validity        21/21 (100%)  │
│ Grounding Accuracy         7/7 (100%)  │
│ Confidence Accuracy        7/7 (100%)  │
│ False-Standard Rate        0/7 (0%)    │
│ Policy Violations           0          │
│ Adversarial Pass         2/2 tested*   │
└───────────────────────────────────────┘
* Q12, Q19 tested (both correct refusals). Q13, Q18, Q20 — the remaining
  adversarial/hallucination-trap cases — are blocked by credit, not tested.
```

**This dashboard is internal.** Every number above has an "n tested" behind
it that is smaller than 20 — see the results table below before repeating
any of these numbers as if the full set were covered.

## Results — per query

| ID | Category | Ran | Standard | Grounding | Confidence | Citations | False std. | Failure mode |
|---|---|---|---|---|---|---|---|---|
| Q01 | exact_identifier | ✅ | ✅ | ✅ | ✅ | 3/3 | no | NONE |
| Q02 | exact_identifier | ✅ | ✅ | ✅ | ✅ | 6/6 | no | NONE |
| Q03 | messy_identifier | ✅ | ✅ | ✅ | ✅ | 8/8 | no | NONE |
| Q04 | messy_identifier | ✅ | ✅ | ✅ | ✅ | 3/3 | no | NONE |
| Q05 | part_section | ❌ | — | — | — | — | — | INFRASTRUCTURE_FAILURE (credit) |
| Q06 | part_section | ❌ | — | — | — | — | — | not attempted (credit) |
| Q07 | natural_language | ❌ | — | — | — | — | — | not attempted (credit) |
| Q08 | natural_language | ❌ | — | — | — | — | — | not attempted (credit) |
| Q09 | natural_language | ❌ | — | — | — | — | — | not attempted (credit) |
| Q10 | natural_language | ❌ | — | — | — | — | — | not attempted (credit) |
| Q11 | ambiguous_product | ✅ | n/a | ✅ | ✅ | 1/1 | no | NONE |
| Q12 | unsupported_query | ✅ | ✅ | n/a | ✅ | — | no | NONE |
| Q13 | unsupported_query | ❌ | — | — | — | — | — | not attempted (credit) |
| Q14 | evidence_question | ❌ | — | — | — | — | — | not attempted (credit) |
| Q15 | comparison | ❌ | — | — | — | — | — | not attempted (credit) |
| Q16 | certification | ❌ | — | — | — | — | — | not attempted (credit) |
| Q17 | testing | ❌ | — | — | — | — | — | not attempted (credit) |
| Q18 | prompt_injection | ❌ | — | — | — | — | — | not attempted (credit) |
| Q19 | hallucination_trap | ✅ | ✅ | n/a | ✅ | — | no | NONE |
| Q20 | hallucination_trap | ❌ | — | — | — | — | — | not attempted (credit) |

("n/a" for Standard on Q11/Q12/Q19 means there's no single fixed
`expectedStandardIds` to check — the pass/fail is captured instead in the
Grounding/Confidence columns, which are what actually matters for these
soft-ambiguous / hard-negative cases.)

## What was actually verified

- **Exact and messy identifier resolution → generation**: Q01–Q04 all
  produced `groundingState: "verified"`, `confidence: "high"`, and every
  cited chunk matched the database exactly (documentId, section, clause,
  sourceUrl). The identifier resolver's output survives all the way through
  to a correct, well-cited answer.
- **Ambiguous query hedging (Q11)**: the model did *not* claim certainty for
  "stainless steel water bottles for children" — returned
  `supported_inference` / `medium`, with an explicit limitation stating the
  evidence doesn't specifically cover this product. This is the single
  highest-value behavior this milestone set out to check, and it held.
- **Hard refusals (Q12, Q19)**: a genuinely out-of-corpus topic (solar
  panels) and a fabricated standard number (IS 99999:2099) both produced
  zero recommendations, `confidence: "none"`, and an answer that explicitly
  says the evidence wasn't found — not a hedge, an actual refusal.
- **Citation integrity**: 21/21 citations across all 7 tested queries
  resolved to a real chunk in the database with matching document,
  section, clause, and source URL. Zero invented citation metadata.
- **False-standard rate**: 0/7. No recommendation named a standard number
  that isn't a real ingested document.

## What was NOT verified (blocked, not passing or failing)

13 of 20 golden queries — including **all 4 remaining adversarial/
hallucination-trap cases beyond Q12/Q19** (Q13, Q18, Q20), the comparison
case (Q15), both certification/testing cases (Q16, Q17), and the
part-section regression check at the generation layer (Q05, Q06) — have
**no generation-level result at all**. The harness (`scripts/eval-
generation.ts`) stopped itself the moment OpenRouter returned a
credit-exhaustion error, rather than continuing to burn failed calls.
Retrieval-level behavior for all of these is already verified (12/12,
8/8) — what's unverified is specifically whether *generation* preserves
that correctness.

**Do not read "0 policy violations" or "0% false-standard rate" as
covering the full 20-query set. They cover 7.**

## Failure classification

Only one query failed to produce a result: **Q05, INFRASTRUCTURE_FAILURE**
(credit exhaustion mid-request). Zero RETRIEVAL_FAILURE, EVIDENCE_SELECTION_
FAILURE, GROUNDING_FAILURE, GENERATION_FAILURE, CITATION_FAILURE, or
POLICY_FAILURE occurred among the 7 queries that did run.

## Recommended next milestone

Not a reranker, not a clarification loop yet — **finish this baseline**.
The 7/20 sample is a genuinely good sign (100% across every dimension
checked), but it's dominated by identifier-lookup queries (Q01-Q04), which
are the *easiest* category since the deterministic identifier resolver
does most of the work before generation even runs. The categories most
likely to actually stress the grounding logic — comparison (Q15),
certification (Q16), testing (Q17), and three of five adversarial/
hallucination cases (Q13, Q18, Q20) — are entirely untested. Getting more
OpenRouter credit (or resolving the Vercel Gateway billing block) and
running `npx tsx scripts/eval-generation.ts` to completion is the
single highest-value next action.
