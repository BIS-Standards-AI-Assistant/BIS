# AI/ML Implementation Baseline

Written before any code changes for the "complete the AI/ML layer" mission
(2026-09-03). Full detail already exists in `docs/AI_ML_STATUS_REPORT.md`
(written minutes earlier this session, independently verified against
live DB + full test suite) — this document only summarizes it plus
records the exact `npm run` output at the start of this task, per that
task's own §0 requirement.

## Baseline commands run

```
npm install        → no changes (already installed)
npm run            → lint, dev, build, start, typecheck, db:push, db:studio,
                      ingest, test:ml, test:unit, test, links:check,
                      eval:retrieval, eval:reranker, eval:generation,
                      eval:validate, eval:calibration, verify, data:discover,
                      data:migrate-existing, data:report, tools:smoke,
                      agent:smoke  — all scripts referenced in package.json
                      exist as real files; none are stubs.
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → clean
npm run test:unit   → 196/196 passing (vitest)
npm run test:ml     → 45/45 passing (4 scripts, tsx/assert-based)
npm run build       → clean production build, 23 routes
```

No script referenced in the task prompt is missing from this repo.

## Current architecture (verified, not assumed)

```
USER
 -> normalizeQuery (deterministic)
 -> extractQueryIntent (LLM #1, deterministic fast-path for bare IDs,
    deterministic keyword fallback if no provider)
 -> retrieveChunks (pgvector + Postgres FTS + regex identifier boost,
    fused via RRF, reranked by a deterministic document-diversity
    reranker — NOT a trained ML model)
 -> aggregateEvidence -> analyzeCoverage -> detectConflicts
 -> computeGrounding (deterministic) -> computeEngineConfidence (deterministic)
 -> generateAnswer (LLM #2, prose only, schema-constrained, falls back to
    a deterministic evidence-only answer if no provider succeeds)
 -> validateRecommendationExplanations (drops any LLM-invented standard)
 -> response
```

Built this session but **not called by the route above**:
`src/lib/query-planner.ts` (deterministic plan-type/complexity
classifier), `src/lib/tools/*` (8 deterministic tools:
`resolveStandard`, `getStandard`, `searchStandards`,
`findApplicableStandards`, `checkMandatoryStatus`, `findQCO`,
`getCertificationScheme`, `compareStandards`), `src/lib/agent/
orchestrator.ts` (bounded, max-3-iteration tool-call loop). All are
tested (22 unit tests) and live-smoke-verified against the real DB
(`npm run tools:smoke`, `npm run agent:smoke`), but `/api/v1/query`
does not import any of them. This is this session's own audit's
top-ranked finding.

## Current data (live DB, verified 2026-09-03)

| Table | Rows | Notes |
|---|---:|---|
| documents | 4 | Real ingested BIS product manuals, real checksums |
| chunks | 142 | 142/142 have a non-null embedding |
| standards | 51 | 25 `verified`, 26 `needs_review` (merged this session from an upstream update that repeats a previously-documented fabrication) |
| qcos | 46 | 21 `verified`, 25 `needs_review`; **0/46 have a real notificationDate/effectiveDate** |
| certification_schemes | 4 | |
| sources | 44 | |
| **relationships** | **0** | No extraction script has ever populated this table |
| query_logs | 18 | Real logged queries from this session's live testing |

## Current blockers (verified)

1. **Knowledge graph has 0 edges.** Real FK data exists (`documents.standardId`, `qcos.standardId`) that could be deterministically materialized into `relationships` rows with real provenance, but nothing does this yet.
2. **Query planner/tools/orchestrator are disconnected from production** — real code, zero live effect.
3. **Zero real temporal data** — every `qcos.notificationDate`/`effectiveDate` and `standards.editionYear`/`status` is null. Any "current applicability" or "amendment" answer is structurally unanswerable, not just unimplemented.
4. **26/51 standards are unverified**, sourced from a third party with a documented history of fabricating the exact same fact three times.
5. **Reranker is a deterministic heuristic**, not a trained ML model — no labeled query-document pair dataset exists to train one (task's own stated minimum: 100+ pairs).
6. **Confidence is deterministic but uncalibrated** — `scripts/calibrate-confidence.ts` already exists and correctly reports "insufficient data" rather than fabricating a calibration curve.
7. **Local (Ollama) and OpenRouter-free providers have no live-tested success recorded this project's history** — only OpenRouter paid has confirmed live successes (7, in `data/evaluation/generation-results.json`).
8. **Golden query set is 20, not 100+.**

## Provider configuration (verified from `.env.local` presence, not values)

`DATABASE_URL` set (Neon, live-connected — `/api/v1/health` returns `{"status":"ok","database":"connected"}`). `OPENROUTER_API_KEY` presence drives `LLM_PROVIDER` routing per `src/lib/providers/router.ts`'s `ROUTING_ORDER = ["local", "openrouter-free", "paid"]`. Whether a local Ollama server is actually reachable was **NOT VERIFIED** this session (no local server was started to test it).

## Decision for this task: highest-value next increment

Per the task's own instruction to determine the highest-value missing
capability from the repository rather than ask, and consistent with
this session's own just-completed audit's top two recommendations
("wire the orchestrator into the live route" and "give the knowledge
graph its first real relationship row"), this task proceeds with:

1. **Phase 2 (partial): materialize real relationships** from existing
   FK data (`documents.standardId`, `qcos.standardId`) — zero new data
   collection, zero fabrication risk, gives the graph its first
   provenance-carrying rows.
2. **Phase 3: wire the query planner + tool registry + agent
   orchestrator into `/api/v1/query`**, additively (a new response
   field, not a replacement of the existing retrieval/grounding/
   confidence/LLM pipeline), so the already-tested code actually
   affects a live request.

Both are scoped to fit "small, composable, testable changes" per the
task's own §38 — not the full 39-section spec, which would require
weeks of real data-collection work (large corpus ingestion, QCO date
sourcing, 100-query golden set, ML reranker training data) that cannot
be honestly completed in one session without fabrication.
