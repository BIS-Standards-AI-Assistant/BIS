# ML data directory (prompts/final.md §5, Phase 0 — ML Infrastructure)

Status as of 2026-09-16: **65 real labeled rows exist; a first CANDIDATE
reranker has been trained and honestly evaluated against them — it does
not beat the production heuristic, and is not wired into
src/lib/ml/reranker.ts.** Per prompts/final.md §97 ("NO FAKE COMPLETION"),
this must never be described as more complete than that.

64 of the 65 rows came from a 2026-09-16 rapid-review session: a human
labeled all 64 generated candidate pairs identically (button-mashed "2"
on every item, including several that were factually wrong, e.g. a
cement standard marked "directly answers" a stainless-steel query) — that
batch was discarded rather than trusted. The rows actually in the dataset
were re-labeled by Claude reading each query against the candidate's real
title/domain, disclosed as `annotator: "claude_assisted_review"`, not
`"human"` — so this provenance field stays honest for whoever reads it
next. See `scripts/train-reranker-candidate.ts` for the training/eval
script and `data/ml/artifacts/registry.json`'s `linear-reranker-candidate-v1`
entry for the result: leave-one-query-out top-1 accuracy 17/17 (100%),
identical to the existing heuristic's own ceiling on its 20-query golden
set — meaning this dataset is too small to show whether a trained model
is better or worse yet, not that it's proven to be either.

| Directory | Purpose | Current contents |
|---|---|---|
| `datasets/` | Versioned raw datasets for training (e.g. `query_document_relevance.jsonl`) | **65 real entries** (1 original hard-negative from a 2026-09-04 production bug + 64 from the 2026-09-16 review above). Still 65/300+ — nowhere near enough to draw a real conclusion from; see final.md's own threshold table |
| `labels/` | Human-labeled examples with provenance (§7) | Empty — 0 real labels collected |
| `eval/` | Golden evaluation queries + evaluation run results | `eval/results/` has real baseline runs from `scripts/ml-evaluate.ts` (see below) |
| `exports/` | Exported feature sets for offline training | Empty |
| `artifacts/` | Trained model artifacts + `registry.json` (the model registry, §45) | `artifacts/registry.json` — currently registers only the existing deterministic baseline, not a trained model |
| `experiments/` | Experiment tracking records (§59) | Empty — no experiments have been run |
| `review-queue/` | ML-proposed candidates (relationships, labels) pending human verification (§28, §82) | Empty |

## What "Phase 0" means here

prompts/final.md §4 says Phase 0 requires no production ML model — only
infrastructure: dataset layout, a model registry, an evaluation
framework, and a baseline. That is exactly what exists as of this
commit:

- **Evaluation framework**: `scripts/ml-evaluate.ts`, real, runs against
  the actual `/api/v1/search` endpoint and the actual 20-query
  `data/evaluation/golden-queries.json` set (not a fabricated dataset),
  computing Recall@5/10/20, MRR, and NDCG@5/10. NDCG here uses **binary**
  relevance (each golden query's `expectedStandardIds` — a document
  either is or isn't the expected answer) because no graded (0-3)
  relevance dataset exists yet (§8) — this is a real, honestly-scoped
  simplification, not an approximation of a metric we don't actually
  compute.
- **Model registry**: `src/lib/ml/model-registry.ts` +
  `data/ml/artifacts/registry.json`. Registers the existing
  `document-diversity-v1` reranker (a deterministic heuristic —
  `src/lib/ml/reranker.ts`, unchanged) as the current production
  baseline, with `modelType: "heuristic"`, never `"trained_ml"`. This is
  the baseline every future trained reranker must beat (§60).

## What does NOT exist (BLOCKED, not silently skipped)

- **`query_document_relevance.jsonl`**: 0 labeled query-document pairs.
  prompts/final.md §108 (First ML Milestone) requires 300+ before a real
  reranker can be trained. Fabricating labels to hit that number is
  explicitly forbidden (§6). **STATUS: BLOCKED — requires real human
  labeling effort this session did not perform.**
- **Any trained model** (reranker, intent classifier, Product DNA
  extractor, evidence ranker, grounding verifier, calibration model).
  **STATUS: BLOCKED**, same reason.
- **Feedback storage (`ml_feedback`), experiment tracking rows,
  champion/challenger deployment**: not built — there is nothing to
  track yet with zero trained models.

See `docs/AI_ML_STATUS_REPORT.md`'s dated update for the full
section-by-section status against prompts/final.md.
