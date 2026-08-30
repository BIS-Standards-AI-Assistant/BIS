# Intelligence Engine V1 — Repository Audit

Written before any code changes for `prompts/rag.md` ("BIS NAVIGATOR —
INTELLIGENCE ENGINE V1: RAG + KNOWLEDGE GRAPH + TOOL-BASED AGENT
ORCHESTRATION"). Scope: describe what already exists against that spec's
target architecture, so implementation only adds what's actually missing.

## 1. Existing architecture (already matches the spec's §0 "assume this
already exists" list — verified by reading the code, not assumed)

Pipeline, as wired in `src/app/api/v1/query/route.ts`:

```
normalizeQuery (src/lib/query-normalization.ts)
  -> extractQueryIntent (src/lib/intent.ts) — LLM #1, or a deterministic
     fast path for exact-identifier queries, or a deterministic keyword
     fallback if no provider is available
  -> retrieveChunks (src/lib/retrieval.ts) — hybrid semantic (pgvector) +
     keyword (Postgres FTS) + exact-identifier boost, fused via
     Reciprocal Rank Fusion, reranked by documentDiversityReranker
     (src/lib/ml/reranker.ts)
  -> aggregateEvidence (src/lib/evidence-aggregation.ts) — chunk-level to
     document-level, geometric-decay weighting bounded at ~2x best chunk
     so volume can't beat relevance
  -> analyzeCoverage (src/lib/coverage-analysis.ts) — per-candidate,
     does the evidence actually address product/material/useCase/
     targetUser/sector/testing/certification/identifier
  -> detectConflicts (src/lib/conflict-detection.ts) — version conflicts,
     superseded-standard language, mandatory/voluntary contradictions
  -> computeGrounding (src/lib/grounding.ts) — deterministic
     verified/supported_inference/insufficient_evidence state from
     measurable signals, with a disqualifying rule for explicit
     identifier mismatches
  -> computeEngineConfidence (src/lib/confidence.ts) — band gated by
     groundingState first so state and band can never contradict
  -> generateAnswer (src/lib/answer.ts) — LLM #2, prose only, explicitly
     forbidden from introducing standard numbers/citations/grounding/
     confidence not already in the evidence package; falls back to
     buildEvidenceOnlyAnswer() when no provider is available
  -> validateRecommendationExplanations — drops any LLM-named standard
     number not already in the engine's own candidate list
```

This already satisfies the spec's core rule (§1: "the LLM must not be
the source of truth") end to end — grounding, confidence, and
citation/candidate identity are 100% deterministic before either LLM
call, and the LLM output is filtered against that deterministic result,
not merged with it.

Provider architecture (`src/lib/providers/`): local / OpenRouter-free /
paid chain, `router.ts` resolves order from `LLM_PROVIDER`, per-provider
cooldown on failure, `?debug=1` on `/api/v1/query` already exposes a
partial internal trace (normalized query, retrieved chunk count,
aggregated evidence, grounding by standard) — a starting point for the
spec's §43 debug mode, not yet the full trace it asks for (no plan,
no tool-call, no provider-routing detail in that payload).

Tests: 121 vitest tests + 4 `scripts/test-*.ts` ML-pipeline test files,
all passing as of the last `npm run verify` run this session. Golden
retrieval set: 20 queries (12 positive + 8 negative), 12/12 recall and
8/8 no-false-match — this is the "100+ tests" and "12/12, 8/8" the spec
references as an acceptance floor (§53).

## 2. Database schema (from `src/db/schema.ts`, verified against a live
`information_schema.tables` query and `scripts/data-report.ts` output
from the prior session)

Retrieval engine tables (unchanged, source of truth for chunks/vectors):
`documents`, `chunks` (HNSW index on `embedding`), `query_logs`.

Knowledge-graph foundation tables (added in the prior `dataAcquisition.md`
milestone, per the spec's own §10/§49 "Postgres is enough, don't
introduce Neo4j"): `standards`, `sources`, `certification_schemes`,
`qcos`, `relationships`. `documents.standard_id` links ingested files to
a `standards` row.

Live data as of the last coverage report (`data/reports/coverage-report.md`):
**25 standards** (all `verificationStatus: verified`), **4 documents**,
**142 chunks**, **3 certification schemes**, **21 QCOs**, **22 sources**,
**0 relationships**. 21/25 standards have a QCO row; 4/25 have an
ingested document; 1/25 has neither.

This is the single most important fact for planning phase order: the
`relationships` table — the actual graph edges the spec's §10-§13
("Knowledge Graph", "Relationship Model", "Graph Query Engine") are
about — is empty. There is no relationship-extraction script yet
(`scripts/data-relationships.ts` does not exist). Building a graph
*query* engine (`getNeighbors`, `findPath`, `findCertificationPath`,
etc.) now would be querying a graph with zero edges — it would pass
tests against fixtures but return nothing for every real query. `qcos`
and `certification_schemes`, by contrast, have real rows today and
already carry a standard reference where relevant (`qcos.standardId`).

`src/lib/knowledge-graph.ts` already exists: `RELATIONSHIP_TYPES` (12
types), `isKnownRelationshipType`, `validateRelationshipCandidate` — the
write-side guard rail the spec's §9/§12 (never fabricate a relationship,
every edge needs provenance) requires. This is infrastructure for
Phase 3/4 whenever a real extraction script populates `relationships`;
it is not itself a query engine.

`src/lib/certification-schemes.ts` reads a separate JSON fixture
(`data/bis-standards-dataset/qco-standards.json`), not the `qcos`/
`certification_schemes` DB tables — this is a **duplicated-functionality
risk**: the same certification/QCO facts now exist in two places (the
migrated DB rows and the original JSON file used by the certification
page and Standard Passport). Not fixed in this pass — flagged, since
resolving it is a larger refactor than fits inside a "first justified
phase," and neither existing consumer is broken by leaving it as-is.

## 3. Existing APIs

`GET /api/v1/health`, `GET /api/v1/search`, `GET /api/v1/standards/[id]`
(document + chunks, not yet the `standards` table), `POST
/api/v1/query` (the main pipeline above), `GET
/api/v1/certification-schemes` (reads the JSON fixture above). No tool
registry, no query planner, no agent orchestrator, no graph endpoints
exist yet.

## 4. Gaps against the rag.md target, in the spec's own phase order

| Phase | Spec asks for | Status |
|---|---|---|
| 0 | Repository audit | DONE — this document |
| 1 | Query planner (plan types, complexity) | MISSING |
| 2 | Domain tool registry | MISSING |
| 3 | Knowledge graph relational layer | DONE (prior milestone) |
| 4 | Graph retrieval / query engine | BLOCKED — 0 relationship rows to query; building this now would return empty results for every real call |
| 5 | Multi-channel retrieval orchestration | PARTIAL — retrieval.ts already fuses semantic + keyword + identifier channels via RRF; no metadata/relationship/service channels |
| 6 | Evidence/claim model | PARTIAL — evidence-aggregation.ts + coverage-analysis.ts already do this at the document level; no explicit `Claim` object |
| 7-8 | Agent orchestrator + bounded loop | MISSING |
| 9 | Answer compiler | PARTIAL — `EvidencePackage`/`recommendations` in query/route.ts already is a structured pre-LLM object; not a single named module |
| 10 | Model routing by complexity | PARTIAL — provider fallback chain exists; no complexity-based routing yet (every query gets the same treatment) |
| 11 | Workflow intelligence | MISSING |
| 12 | Caching | MISSING |
| 13 | Evaluation expansion (100 queries) | MISSING (20 today) |
| 14 | Observability | PARTIAL — `query_logs` table + provider event logs exist; no structured per-stage timing/tool-call log |
| 15 | Frontend integration | N/A this pass |

## 5. Architectural risks found during this audit

- **Empty graph risk (see above)**: any Phase 4 work must not be
  attempted before a real extraction script exists, or it will look
  complete while returning nothing.
- **Duplicated certification data** (JSON fixture vs. DB tables) — flagged
  above, not fixed.
- **`resolveStandard`-shaped logic already exists three times**
  (`standards-id.ts` resolver, `retrieval.ts`'s identifier boost, and the
  fast path in `intent.ts`) with no single "tool" wrapper — a Phase 2
  tool registry should wrap these, not reimplement identifier resolution
  a fourth time.
- **`MAX_CANDIDATES = 4` / `RETRIEVAL_LIMIT = 12`** in `query/route.ts`
  are hardcoded, not complexity-derived — a Phase 10 concern, left as-is
  in this pass.

## 6. Recommended implementation order for this session

Given the empty-graph risk above, and the instruction to implement only
the first justified phase(s) rather than attempt the whole 60-section
spec superficially:

1. **Phase 1 — Query Planner** (`src/lib/query-planner.ts`): deterministic
   plan-type classification (identifier fast path reused from
   `intent.ts`'s pattern) + complexity scoring, LLM-assisted only where
   the deterministic signal is ambiguous. Does not depend on the graph.
2. **Phase 2 — Domain Tool Registry** (`src/lib/tools/`): deterministic
   tools wrapping *already-populated* tables and existing pipeline
   functions — `resolveStandard`, `getStandard`, `checkMandatoryStatus`,
   `findQCO`, `getCertificationScheme`, `searchStandards`,
   `findApplicableStandards` — with the spec's exact "return
   `{status: "not_found"}`, never invent" contract (§9). Graph-dependent
   tools (`findLaboratories`, `findRelatedStandards`,
   `findReferencedStandards`, `compareStandards`'s relationship half) are
   explicitly **not** implemented this pass — there is no laboratory
   table and no relationship data to back them; stubbing them would
   violate the same "never fabricate" rule the tool contract itself
   states.

Everything else in the spec (agent orchestrator, workflow intelligence,
caching, 100-query eval, observability, graph query engine) is deferred
to a future session once relationship extraction actually populates the
graph, consistent with how every prior milestone in this project scoped
down rather than attempting full specs superficially.
