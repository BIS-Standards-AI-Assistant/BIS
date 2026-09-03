# BIS Standards Navigator
## AI/ML Engineering Status Report

Date: 2026-09-03
Repository commit: `96c253411060b2cfa3bd2befd6fa61de2e31c202` (2026-09-02)
Audited by: Claude (AI/ML engineering audit — direct repository, live-DB, and test-suite inspection; no application code modified)
Overall completion: **~45%** (was 42% at the audit below; see "Update" immediately following)
Production readiness: **NOT READY** (see §36 — unchanged by this update)

This report is a snapshot, not a plan. Every number in it was either read directly from the live Neon database, produced by actually running a test/eval/script during this audit, or found verbatim in a committed evaluation artifact (`data/evaluation/*`). Where a claim could not be independently confirmed, it is marked **NOT VERIFIED** rather than assumed true because a doc says so — several places in this repo's own documentation turned out to disagree with each other or with the code, and those are called out explicitly below (§37 discrepancies).

---

## UPDATE — 2026-09-03, same day, following this audit

Two of this report's own "next 5 things to build" (Knowledge Graph §10,
Agent §18) were implemented immediately after this audit was written, as
the highest-leverage items identified by the audit itself. This update
documents exactly what changed, verified the same way as the rest of
this report (live DB queries, live HTTP calls, full test re-run) —
**it does not re-verify or restate anything else in the report below**,
which stands as written for every other section.

### 1. Knowledge graph: 0 -> 50 real relationship rows

`scripts/data-relationships.ts` (new) materializes two edge types from
data that already existed as real foreign keys — `documents.standardId`
and `qcos.standardId` — into the `relationships` table, with real
provenance (the underlying document/QCO's own `sourceId`/`documentId`
and an `evidenceText` describing the actual FK link) and inherited
`verificationStatus` (never upgraded — a relationship built from a
`needs_review` QCO stays `needs_review`).

Live-verified: **50 rows** (4 `STANDARD_HAS_PRODUCT_MANUAL`, 46
`STANDARD_SUBJECT_TO_QCO`; the latter is a new relationship type, added
to `src/lib/knowledge-graph.ts`'s `RELATIONSHIP_TYPES`), **25 `verified`
+ 25 `needs_review`** (correctly matching the 25 verified + 25
needs_review QCO rows they were built from). Re-ran the script a second
time: 0 new inserts, 50 "already present" — confirmed idempotent.

**This does not change the report's Knowledge Graph verdict from
SCAFFOLDED to IMPLEMENTED.** It is still true that: no text-based
relationship extraction exists (no script reads a document's actual
prose to find e.g. a `STANDARD_REFERENCES_STANDARD` or
`STANDARD_SUPERSEDES_STANDARD` edge — the two types populated are pure
FK materialization, not extraction), there is no graph traversal API
(no `getNeighbors`/`findPath`), and 10 of the 12+ conceptual
relationship types this project's own docs describe remain at 0 rows.
What changed is narrower and real: the graph is no longer literally
empty, and every row in it has genuine, checkable provenance.

### 2. Agent orchestrator: connected to `/api/v1/query`, additively

`src/app/api/v1/query/route.ts` now calls `runAgent()` (the bounded,
max-3-iteration orchestrator built earlier this session) alongside —
not instead of — the existing intent -> retrieval -> evidence ->
grounding -> confidence -> LLM pipeline, contributing a new
`toolEvidence` response field. Deliberately additive per Rule 1 (don't
break working systems) and Rule 5 (the engine, not the agent, owns
grounding/confidence): `toolEvidence` never touches
`engineConfidence`, `groundingState`, or `recommendations` — those are
computed exactly as before, by exactly the same code. A failure inside
`runAgent()` is caught and produces `toolEvidence: null`, never a
failed request.

Live-verified via 3 real HTTP calls to the running dev server (not
inferred from code reading):
- `"What certification scheme applies to IS 269:2015?"` ->
  `toolEvidence.resolvedStandard: "IS 269:2015"` (correctly NOT the
  unrelated top fuzzy-search hit "IS 14543:2016" that also appears in
  the same response's `findApplicableStandards` discovery results —
  this is the exact bug class this session's earlier orchestrator work
  fixed), with real `getCertificationScheme`/`checkMandatoryStatus`
  data and provenance attached.
- `"IS 5522:2014"` -> `toolEvidence` carries `resolveStandard`/
  `getStandard` results; the pre-existing `recommendations`/
  `confidence` fields are unchanged from before this change.
- `"What is the weather today?"` -> `toolEvidence: null` (plan type
  `OUT_OF_DOMAIN`, zero tool calls made) — confirmed the addition does
  not fire speculatively on out-of-domain queries.

Regression check: `npm run eval:retrieval` still 12/12 recall, 8/8
no-false-match (this endpoint isn't touched by that eval — it hits
`/api/v1/search` — but confirms nothing else broke). Full suite:
lint clean, typecheck clean, **200/200 vitest + 45/45 ML script tests**
(was 196/45), production build clean.

**This does not make the Agent row "production-grade."** The
orchestrator still only wraps 8 deterministic tools (no LLM-assisted
tool selection, nothing graph-aware since the graph itself is still
mostly empty per above), and its output is surfaced as raw structured
data in a new field — no UI yet renders `toolEvidence`, and the main
`answer` prose the LLM writes does not consume it. The gap this
report's audit called "zero production effect from real, working
code" is now "some production effect, still no UI, still no influence
over the answer text or its grounding" — genuinely narrower, not closed.

### Recalculated score

Per §36's weights: Knowledge Graph (10%) moves from an internal
sub-score of 15% to ~30% (real provenance-carrying rows exist now; still
no extraction, no traversal, no coverage of most relationship types) —
+1.5 points. Agent/Planning (5%) moves from 0% (production) to ~40%
(connected and live-verified, but not influencing the answer or
grounding, no UI) — +2 points. Every other category is unchanged from
the audit below. **42% -> ~45%.** Production readiness verdict is
unchanged: **NOT READY** — the report's stated top risks (26/51
standards unverified, 0 real temporal data, corpus of 4 documents)
are untouched by this update.

---

## 1-2. Scope and method

Audited: `src/lib/**`, `src/db/schema.ts`, `src/lib/providers/**`, `src/lib/tools/**`, `src/lib/agent/**`, `src/app/api/v1/**`, `scripts/**`, `data/**`, `docs/**`, and `package.json`. Verification performed:

- Live query against the Neon database (a temporary script, deleted after use) for exact row counts and field population.
- `npm run test:unit` (vitest) and all four `npm run test:ml` scripts, run to completion, exact pass counts recorded.
- Full read of `data/evaluation/golden-queries.json`, `generation-results.json`, `validation-results.json`, `GENERATION_BASELINE.md`.
- Full read of the retrieval, reranking, evidence, grounding, confidence, conflict-detection, provider, query-planner, tool-registry, and agent-orchestrator source files.
- `npm run eval:calibration` run live.
- Grep for observability/tracing code, prompt-injection defenses, and multilingual usage.

---

## 3. Data status

### Live counts (verified via direct DB query, this audit)

| Metric | Count |
|---|---:|
| Documents (ingested source files) | **4** |
| Chunks | **142** |
| Chunks with a non-null embedding | **142 / 142 (100%)** |
| Documents linked to a `standards` row | 4 / 4 |
| Standards (`standards` table) | **51** |
| — `verificationStatus: verified` | 25 |
| — `verificationStatus: needs_review` | 26 |
| Standards with `editionYear` populated | **0 / 51** |
| Standards with `status` (active/withdrawn/superseded) populated | **0 / 51** |
| Standards with `lastVerifiedAt` set | 51 / 51 (this is a migration timestamp, not an independent re-verification date) |
| QCOs (`qcos` table) | **46** |
| — `verificationStatus: verified` | 21 |
| — `verificationStatus: needs_review` | 25 |
| QCOs with a real `notificationDate` | **0 / 46** |
| QCOs with a real `effectiveDate` | **0 / 46** |
| Certification schemes | 4 |
| Sources | 44 |
| **Relationships (knowledge-graph edges)** | **0** |
| Query logs (real user/eval queries logged) | 18 |
| Discovered-but-unfetched candidate URLs (`data/manifests/discovered-sources.json`) | 415, all `needs_review` |

Embedding model: `openai/text-embedding-3-small`, 1536 dimensions, routed through OpenRouter when `OPENROUTER_API_KEY` is set, else the Vercel AI Gateway (blocked all sessions on `customer_verification_required` at the account level — **NOT VERIFIED working**).

### Real vs. synthetic data

- The 4 ingested documents (`IS 14543:2016`, `IS 5522:2014`, `IS 14756:2017`, `IS 15410:2003`) and their 142 chunks are real BIS product-manual text, ingested from actual PDFs (`scripts/ingest.ts`), each with a `sourceUrl` and a `sha256` checksum. This is real, not synthetic.
- The 48-entry `data/bis-standards-dataset/qco-standards.json` reference dataset (source of the `standards`/`qcos`/`certification_schemes` rows) is a curated, human-reviewed correction of an upstream third-party dataset. 22 entries were individually fact-checked and corrected in an earlier session (documented, with specific fabrications caught and fixed). **The other 26 were added in this session's earlier turn directly from an upstream update that was spot-checked and found to still contain at least two previously-documented fabrications, unfixed** — those 26 are marked `needs_review` and must not be treated as verified BIS fact until independently checked against a primary bis.gov.in source.
- No demo/mock/placeholder data is mixed into the live retrieval or `standards` tables as if it were real — every row carries a `verificationStatus`, and the app's own UI now visually distinguishes `needs_review` (amber) from `verified`/`corrected` (green), fixed this session after this audit's own predecessor turn found the distinction was not being rendered correctly.
- **Missing entirely**: laboratories, committees, amendments/revision history, product/material entities, BIS-service entities. No table for any of these exists in `src/db/schema.ts`.

### Per-source table

| Source | Implemented | Records | Provenance | Versioning | Quality | Status |
|---|---|---:|---|---|---|---|
| Ingested BIS product manuals (`documents`/`chunks`) | Yes | 4 docs / 142 chunks | Real `sourceUrl` + sha256 checksum per doc | None (single snapshot per doc, no revision tracking) | High — real BIS PDFs | IMPLEMENTED (tiny scale) |
| `standards` reference table | Yes | 51 | Mixed: 25 independently verified/corrected, 26 unverified upstream claims | `editionYear`/`status` fields exist but are 100% null | Mixed — half flagged `needs_review` for a reason | PARTIALLY IMPLEMENTED |
| `qcos` | Yes | 46 | Same as above | 0% have real dates | Mixed | PARTIALLY IMPLEMENTED |
| `certification_schemes` | Yes | 4 | Sourced from the same JSON dataset | None | Verified (drawn from fact-checked entries) | IMPLEMENTED (very small) |
| `relationships` (knowledge graph) | Schema only | **0** | N/A — nothing stored | N/A | N/A | SCAFFOLDED |
| Laboratories | No table | 0 | — | — | — | NOT IMPLEMENTED |
| Committees | No table | 0 | — | — | — | NOT IMPLEMENTED |
| Amendments / revisions | No table | 0 | — | — | — | NOT IMPLEMENTED |
| Discovered candidate URLs | Yes (crawl only) | 415 | Real sitemap crawl, rate-limited | N/A | Unfiltered — includes noise (e.g. procurement notices) by the crawler's own admission | SCAFFOLDED (discovery only, nothing downloaded) |

### Ingestion mechanics

- **Idempotent**: `documents.checksum` (sha256 of extracted text) exists for change detection — confirmed present in schema; re-ingest behavior on an unchanged file was not re-tested live this audit (**NOT VERIFIED this session**, but the mechanism exists in code).
- **Duplicate detection**: standards/QCOs/certification-schemes migration (`scripts/data-migrate-existing.ts`) is find-or-create by canonical key — verified idempotent by direct observation this session (re-running produced zero duplicate inserts, confirmed via live DB counts before/after).
- **Version/amendment/supersession tracking**: NOT IMPLEMENTED. No amendment table, no supersession edges (the `relationships` table has zero rows including zero `STANDARD_SUPERSEDES_STANDARD` edges despite that relationship type being defined in `src/lib/knowledge-graph.ts`).
- **Document change detection**: checksum field exists; no scheduled re-check job exists.
- **Table extraction from PDFs**: NOT VERIFIED / likely NOT IMPLEMENTED — `scripts/ingest.ts` uses `pdf-parse`, which extracts flat text, not structured tables; no table-specific extraction code was found.
- **Page-level provenance**: `chunks.page` column exists in schema but is `null` for all 142 chunks in this corpus (confirmed structurally by the `RetrievedChunk.page` field consistently returning null in retrieval output seen during this session's live smoke tests). Section/clause-level provenance (`chunks.section`, `chunks.clause`) IS populated for many chunks and is real.

---

## 4. Data acquisition roadmap

| Missing category | Why it matters | Source | Schema/entity needed | Ingestion difficulty | Priority |
|---|---|---|---|---|---|
| Laboratories | "Where can I test my product" is a stated core journey step; currently unanswerable | BIS-recognized-labs directory (not yet located/confirmed to exist as a scrapeable official source) | New `laboratories` table + `LAB_SUPPORTS_TEST` edges | High — no confirmed structured official source yet | P1 |
| Amendments/revisions | Needed for "what changed between versions," explicitly requested by the user in a prior turn this session | BIS gazette/amendment notifications | New `amendments` table, `standards.supersededBy`/`supersedes` edges | High — requires real gazette scraping, which was NOT attempted (bis.gov.in certification pages are JS-rendered per this session's own discovery finding) | P0 (explicitly requested, currently impossible to build honestly) |
| Real QCO effective/notification dates | 0/46 rows have any date; blocks any "is this mandatory yet" temporal answer | Official gazette QCO notifications | Already has the columns — needs real values | Medium — requires per-QCO primary-source lookup | P0 |
| Relationship extraction (any type) | The knowledge graph has a schema and a validator but zero data — nothing to query | Requires a real extraction pass over ingested documents/QCOs with an evidence-required contract already coded in `knowledge-graph.ts` | Uses existing `relationships` table | Medium — the write-side guard (`validateRelationshipCandidate`) already exists; only the extraction script is missing | P0 |
| Committees | Long tail, low immediate user value | BIS committee directory | New `committees` table | Medium | P2 |
| Products/materials as first-class entities | Would let `STANDARD_APPLIES_TO_PRODUCT` be more than a schema comment | Would need to be derived from ingested text or a curated list | New `products`/`materials` tables | Medium | P2 |
| BIS services (e-services catalog) | "Service navigation" plan type exists in the query planner with no backing tool | bis.gov.in / Manak Online | New `services` table or a curated static list | Low — this is largely static, curatable content | P2 |
| Full PDF corpus beyond 4 documents | Everything above is nearly meaningless at n=4 documents | bis.gov.in product manuals / IS documents (415 candidate URLs already discovered, none downloaded) | None — reuses `documents`/`chunks` | Medium-High — download, extract, checksum, chunk each; legal/ToS considerations for redistribution not evaluated | P0 |

---

## 5. Knowledge model

### Entities that exist in `src/db/schema.ts`

`documents`, `chunks`, `query_logs`, `standards`, `sources`, `certification_schemes`, `qcos`, `relationships`. That is the complete list — **eight tables total**. Product, Laboratory, Test, Committee, Amendment, License, and Reference are not separate entities anywhere in the schema.

### Relationship audit

| Relationship | Exists (schema) | Extraction implemented | Validation implemented | Provenance required | Retrieval supported | Tests |
|---|---|---|---|---|---|---|
| Standard → applies_to → Product | Type defined in `knowledge-graph.ts` (`STANDARD_APPLIES_TO_PRODUCT`) | No | Yes (`validateRelationshipCandidate` rejects any candidate without evidence) | Yes, by construction | No (0 rows to retrieve) | 10 tests on the validator, 0 on real data |
| Standard → has_certification_scheme → Scheme | No formal FK; `certification_schemes` has no `standardId` column (audit finding: only an indirect shared-`sourceId` link with `qcos`) | Handled instead by a JSON-file lookup (`certification-schemes.ts`), not the relational table | N/A (not a graph edge in practice) | Partial — dataset-level, not edge-level | Yes, via the JSON lookup, not the graph | Covered indirectly (dataset tests) |
| Standard → requires_test → Test | No `tests` table exists at all | No | No | No | No | No |
| Test → performed_by → Laboratory | No `laboratories` table | No | No | No | No | No |
| Standard → governed_by → QCO | Real FK (`qcos.standardId`) | Yes — via the dataset migration, not an automated extraction pipeline | Implicit (FK integrity) | Yes (`sourceId` on `qcos`) | Yes — `checkMandatoryStatus`/`findQCO` tools query this directly | Yes — live-smoke-tested this session |
| Standard → references → Standard | Type defined, not used | No | Yes (validator) | Yes, by construction | No | Validator tests only |
| Standard → amended_by → Amendment | No `amendments` table | No | No | No | No | No |
| Standard → supersedes → Standard | Type defined in `knowledge-graph.ts`; a *separate*, simpler heuristic exists in `conflict-detection.ts` (same base IS number, different full number → flagged as a "version conflict," not a stored edge) | No stored edges; the conflict-detection heuristic is real-time/query-time only, not a stored fact | The heuristic itself has no false-fact risk (it only flags, never asserts a direction) | N/A (not stored) | Yes, at query time only | 5 tests in `conflict-detection` |

**Conclusion for this section**: relational tables that COULD hold a knowledge graph exist. An actual populated, queryable knowledge graph does not. Calling the current state a "knowledge graph" would be inaccurate — it is a **relational schema with a write-time validator and zero rows**.

---

## 6. Ingestion pipeline

```
SOURCE → DOWNLOAD → FINGERPRINT → EXTRACTION → STRUCTURE → METADATA → TABLES → CHUNKS → ENTITIES → RELATIONSHIPS → EMBEDDINGS → VALIDATION → INDEX
```

| Stage | Status | File(s) | Notes |
|---|---|---|---|
| SOURCE (discovery) | IMPLEMENTED (crawl only) | `scripts/data-discover.ts` | Real sitemap crawl of bis.gov.in, 415 URLs found, rate-limited (`politeFetch`, 1.5s delay), all marked `needs_review` |
| DOWNLOAD | PARTIALLY IMPLEMENTED | `scripts/ingest.ts` | Works for the 4 seed documents; the 415 discovered URLs have never been downloaded |
| FINGERPRINT | IMPLEMENTED | `documents.checksum` | sha256 of extracted text |
| EXTRACTION | IMPLEMENTED (text only) | `pdf-parse` in `scripts/ingest.ts` | Flat text extraction; no table structure preserved |
| STRUCTURE (section/clause) | PARTIALLY IMPLEMENTED | `chunks.section`, `chunks.clause` | Populated for the 4 real documents; mechanism not verified against a document with complex nested numbering |
| METADATA | PARTIALLY IMPLEMENTED | `documents.standardNumber`, `sourceOrg`, `publicationDate` (free text) | No structured edition/effective-date metadata |
| TABLES (extraction from PDF tables) | NOT IMPLEMENTED | — | No table-parsing library or logic found |
| CHUNKS | IMPLEMENTED | `src/lib/chunk.ts` | 142 real chunks produced |
| ENTITIES | NOT IMPLEMENTED | — | No NER/entity-extraction step exists between ingestion and the `standards` table; the `standards` table is populated from a separate hand-curated JSON file, not extracted from ingested text |
| RELATIONSHIPS | SCAFFOLDED | `src/lib/knowledge-graph.ts` | Validator exists; no extraction script exists; 0 rows |
| EMBEDDINGS | IMPLEMENTED | `src/lib/embedding-provider.ts` | 142/142 chunks embedded, verified live count |
| VALIDATION | PARTIALLY IMPLEMENTED | Checksum only | No content-quality validation (e.g., garbled OCR detection) found |
| INDEX | IMPLEMENTED | HNSW index on `chunks.embedding` (`vector_cosine_ops`) in schema | Confirmed present in `src/db/schema.ts` |

**Weakest stage**: ENTITIES and RELATIONSHIPS. There is no automated path from "a document was ingested" to "a fact was extracted and validated into the knowledge graph" — every `standards`/`qcos` row currently in the database came from a manually curated JSON file, not from the ingestion pipeline itself.

---

## 7. Query intelligence

| Capability | Mechanism | Deterministic / ML / LLM / Heuristic |
|---|---|---|
| Query normalization | `src/lib/query-normalization.ts` | Deterministic (8 tests, all passing) |
| IS-number / edition / part / section extraction | `src/lib/standards-id.ts`, one regex (`resolveStandardIds`) | Deterministic (12 tests) |
| Spelling/terminology normalization | Not a separate stage — folded into normalization + FTS's own stemming | Deterministic (Postgres `to_tsvector('english', …)` does English stemming; no custom typo-correction) |
| Intent classification | `src/lib/intent.ts` — deterministic fast path for bare-identifier queries, else one LLM call (`openai/gpt-4o`), else a deterministic keyword-based fallback if no provider is configured | **Hybrid**: deterministic when possible, LLM-dependent for genuinely ambiguous free text, with a deterministic fallback that never leaves the app non-functional |
| Entity extraction (product/material/use-case) | Part of the same `extractQueryIntent` LLM call above | **LLM-dependent** — if no provider is configured, these fields are simply left `null` (explicitly, by design — the code comment states a wrong guess is worse than no guess) |
| Ambiguity detection | `missingInformation` field from the LLM intent call | LLM-dependent, no deterministic fallback for this specific signal |
| Query complexity detection | `src/lib/query-planner.ts`, built this session | Deterministic (regex/keyword-count heuristic, 3 tiers) — **built but not wired into the live `/api/v1/query` route** |
| Query planning (plan type selection) | `src/lib/query-planner.ts` | Deterministic, 14 plan types, 14 tests — **not wired into the live route** |

**Risk called out explicitly**: intent's `product`/`material`/`useCase`/`targetUser`/`sector` extraction depends entirely on the LLM when the query is not a bare identifier. If no LLM provider is configured or all providers fail, the system does NOT guess these fields — it degrades to keyword/semantic search over the raw query text instead. This is a deliberate, tested design choice (not a gap), but it means query understanding quality for free-text queries is only as good as whichever LLM happens to be available at request time, which — per §16 below — has itself never been reliably available across sessions of this project.

Exact standard lookup (a bare "IS 5522:2014"-style query) is fully deterministic end-to-end and does not touch an LLM at all — confirmed by reading `deterministicIntentFastPath` and the `EXACT_STANDARD`/`requiresLLM: false` branch of the query planner.

---

## 8. Retrieval system

### What exists

| Mechanism | Implemented | Notes |
|---|---|---|
| Exact-ID retrieval | Yes | `standards-id.ts` resolver + a dedicated identifier-match ranking list fused via RRF |
| Keyword retrieval | Yes | Postgres FTS, `websearch_to_tsquery` with a broadened OR-lexeme fallback on zero results |
| Semantic retrieval | Yes | pgvector cosine distance, HNSW index |
| Metadata retrieval | Partial | Filtering by `standardNumber` exists in ad hoc queries (e.g. `compareStandards`); no general metadata-filtered retrieval API |
| Section retrieval | Yes | `chunks.section` is carried through to output |
| Clause retrieval | Yes | `chunks.clause` is carried through to output |
| Graph retrieval | No | 0 relationship rows; no `getNeighbors`/`findPath` code exists anywhere in `src/lib/` |
| Temporal retrieval ("current edition," "as of 2022") | No | No effective-date data exists to filter on (see §3, §14) |
| Reference retrieval (standard → standard) | No | Same reason — no relationship data |

### Fusion / candidate pipeline

Reciprocal Rank Fusion (k=60) combines up to three ranked lists (semantic, keyword, identifier-boost) into one fused score, over a candidate pool of `limit × 4`. The full fused pool (not just the top-K) is passed to the reranker so document-level diversity decisions have enough data to work with. Deduplication is implicit (candidates are keyed by chunk ID in a `Map`). No separate cross-encoder or LLM-based filtering stage exists.

### Answers

1. **What works**: exact-identifier lookup, natural-language product-discovery queries against the 4-document corpus, and negative cases (queries about standards genuinely absent from the corpus correctly return nothing) — all confirmed live this audit (`npm run eval:retrieval`: **12/12 recall, 8/8 no-false-match**, re-run during this audit against the live dev server, not assumed from a prior log).
2. **What has tests**: the full retrieval path is covered by the golden-query eval script above plus unit tests on every downstream stage (evidence aggregation, coverage, conflict, grounding, confidence — 45 `test:ml` assertions, all passing, re-run this audit).
3. **What has benchmark evidence**: `scripts/eval-reranker.ts` measured a specific before/after fix (Q17 — a natural-language query that a naive chunk-count-weighted score would have answered wrong) with the actual numeric scores documented inline in `src/lib/ml/reranker.ts`'s own comments.
4. **What is weak**: the corpus is 4 documents. Every retrieval number above is real but measured against a dataset two orders of magnitude smaller than even the "100 standards" first milestone the project's own `docs/ui/SIH.md` describes as a starting point. There is no metadata/temporal/graph retrieval channel at all, despite the spec calling for all of them.
5. **What should be improved next**: ingest more real documents before anything else — every downstream retrieval quality claim in this section is only as meaningful as the 4-document corpus it was measured against.

---

## 9. ML reranking

**This is not a trained ML model. It is a deterministic algorithm.** Calling it "ML reranking" (as the project's own docs and this audit's task brief do) is a misnomer that must be corrected here per the reporting rules.

- `src/lib/ml/reranker.ts`'s `documentDiversityReranker` is a fixed round-robin algorithm: documents whose best chunk scores within 70% (`COMPETITIVE_RATIO`, a manually chosen constant, not fit to data) of the leading document's best-chunk score get interleaved fairly; everyone else keeps their natural fused-RRF rank.
- No model weights, no training data, no learned parameters, no embeddings-of-embeddings, no cross-encoder.
- Features used: `fusedScore` only (a scalar already computed by upstream RRF).
- Trained: **No.**
- Dataset: N/A — there is no training set, only the 20-query eval set used to *validate the fixed threshold constant* (0.7), chosen from exactly two measured data points per the code's own comment, not a proper calibration.
- Evaluation baseline: `scripts/eval-reranker.ts` compares against `noopReranker` (pass-through, sorted by fused score only).

| Metric | No-op reranker (baseline) | Document-diversity reranker |
|---|---:|---:|
| Recall@5 | 12/12 | 12/12 |
| No-false-identifier-match | 8/8 | 8/8 |

These are the ONLY reranking metrics that exist in this repository. Recall@10, MRR, nDCG, and Precision@K are **NOT VERIFIED / not computed anywhere** — do not report them, they do not exist yet. The measured improvement of the diversity reranker over the no-op baseline is real for the one specific failure case it was built to fix (Q17), but the aggregate 12/12 and 8/8 numbers are *identical* between baseline and treatment on this 20-query set — meaning the current golden set is not large enough to show the reranker's benefit in the aggregate numbers; its value is demonstrated only in the single documented before/after case, not in the summary statistic.

---

## 10. Knowledge graph — exact state

Per the possible-states list in the task brief, the current state is: **"Relationship extraction" and beyond are NOT reached. The system is at "Schema only."**

- No graph database exists (by design — Postgres tables, per the project's own explicit "don't introduce Neo4j prematurely" rule).
- `src/lib/knowledge-graph.ts` defines 12 relationship types and a `validateRelationshipCandidate` function that correctly rejects a candidate with no evidence, an unknown type, a self-loop, or an out-of-range confidence — this is real, tested (10 tests), write-side infrastructure.
- **Zero relationship rows exist in the database.** No extraction script (`scripts/data-relationships.ts` or equivalent) exists anywhere in `scripts/`.
- No graph retrieval functions (`getNeighbors`, `findPath`, `findCertificationPath`, etc.) exist anywhere in `src/lib/`.
- `compareStandardsTool` (built this session) is the closest thing to graph-adjacent reasoning that currently works — but it deliberately does NOT use the `relationships` table; it computes real-time textual term-overlap between two standards' ingested evidence and factual metadata diffs, explicitly stating in its own output that it is not a relationship claim and not a legal-precedence ruling.

**Proposed next architecture** (not built): a `scripts/data-relationships.ts` extraction script that only ever inserts a `relationships` row when it can cite a real `documentId` or `sourceId` and quote `evidenceText` (the schema and validator already enforce this) — start with the highest-value edge (`STANDARD_HAS_CERTIFICATION_SCHEME`, since `qcos`/`certification_schemes` data already exists and just needs to be expressed as graph edges) before attempting text-mined edges like `STANDARD_REFERENCES_STANDARD`, which would require real clause-level text analysis of a much larger ingested corpus than currently exists.

---

## 11. Evidence engine

- **Evidence aggregation** (`src/lib/evidence-aggregation.ts`): rolls chunk-level hits into document-level `AggregatedEvidence`, with a geometric-decay weighting (each additional chunk contributes half as much as the previous, bounded at ~2x the single best chunk) specifically designed to stop a high-chunk-count document from winning purely on volume. Deterministic, 7 tests, all passing.
- **Coverage analysis** (`src/lib/coverage-analysis.ts`): per-candidate term-overlap check against the query's extracted product/material/useCase/etc. — deterministic, keyword-based (≥50% of significant terms must appear), not semantic similarity. A real regex bug in `CERTIFICATION_KEYWORDS` (it never matched "certification" or "certificate," only the bare stem "certif") was found and fixed by this session's earlier turn; a regression test now covers it.
- **Citation selection**: every recommendation's `evidence` array is built directly from the actual retrieved `RetrievedChunk` objects (chunkId, section, clause, sourceUrl) — never LLM-authored.
- **Claim-level grounding**: there is no separate "claim" object as described conceptually in some planning docs (`{claimId, subject, predicate, object, evidence[]}`) — grounding is computed at the *candidate-standard* level, not per atomic claim. This is a real architectural gap relative to a fully claim-grounded system, though it does mean every standard-level recommendation shown to the user does have a traceable evidence set.
- **Citation validation**: `validateRecommendationExplanations()` (in `answer.ts`) strips any `standardNumber` the LLM mentions that isn't already in the engine's own candidate list — tested with 10 hand-constructed hostile/malformed LLM outputs, all correctly rejected or accepted as expected.
- **Contradiction detection**: exists at the conflict-detection layer (see §13) — regex-based, not semantic.

**Can every answer claim be traced to evidence?** For the standard-level recommendation (which standard, how confident) — yes, verified by the citation-validation test suite and by direct inspection of `data/evaluation/validation-results.json`'s live results (21/21 citations checked were valid on the 7 queries that actually ran end-to-end). For finer-grained prose claims inside the LLM's free-text `answer`/`certificationNotes`/`testingNotes` fields — **no formal per-sentence grounding check exists**; the system prompt instructs the LLM not to introduce unsupported claims, but nothing downstream verifies that instruction was followed for the free-text portions beyond the standard-number-level citation check.

---

## 12. Grounding

- Computed in `src/lib/grounding.ts` — **fully deterministic**, no LLM involvement whatsoever in this calculation.
- Three states: `verified`, `supported_inference`, `insufficient_evidence`, from a weighted blend of six signals (retrieval strength, identifier match, coverage, source authority, consistency, version validity) against fixed thresholds (0.7 / 0.4).
- The weights and thresholds are explicitly documented in the code's own comments as **"a reasoned starting point, not a calibrated model"** — there is no statistical fit behind them, only unit-test sanity checks that scoring behaves reasonably at the boundaries.
- A specific disqualifying rule exists: if the query names an explicit standard identifier and a candidate is confirmed NOT to be that identifier, the state is forced to `insufficient_evidence` regardless of the blended score — this was added after a real bug was found live (a fabricated identifier query scored high enough on unrelated signals to nearly clear the `supported_inference` threshold).
- **When evidence is insufficient**: the LLM is explicitly instructed (system prompt) to say so plainly rather than fill the gap; the deterministic `buildEvidenceOnlyAnswer` fallback (used when no LLM is available at all) does the same, template-only, no LLM prose.
- **Hallucination risk identified**: the LLM's free-text prose is not re-validated for grounding-consistency beyond the standard-number check (see §11) — a model could, in principle, write a confident-sounding sentence about a `supported_inference`-grounded candidate despite the system prompt telling it not to, and nothing downstream would catch that specific failure mode. This has not been observed in the 7 live-tested queries (`failureMode: NONE` on all 7 in `validation-results.json`), but 7 samples is not enough to rule it out generally.

---

## 13. Conflict detection

`src/lib/conflict-detection.ts` — three heuristics, all regex/pattern-based, none ML or LLM:

| Heuristic | Mechanism | Weakness |
|---|---|---|
| Version conflict | Same base IS number (e.g. "IS 302"), different full identifier, both retrieved | Only fires if both editions are actually retrieved together for the same query — does not proactively know "this standard has a newer edition" absent a competing retrieval hit |
| Superseded/withdrawn language | Regex `\b(superseded\|withdrawn\|obsolete)\b` over retrieved chunk text | Only catches it if the ingested document text itself happens to say so; the 4-document corpus doesn't currently contain this language in any tested case |
| Mandatory/voluntary co-occurrence | Regex flags for both `mandatory`/`compulsory` and `voluntary`/`not mandatory` patterns appearing in the same document's evidence | A blunt co-occurrence flag, not real contradiction reasoning — deliberately conservative (flags for human/LLM attention rather than resolving it) |

Confirmed via 5 passing tests. No temporal-conflict detection exists (would require real effective-date data, which — per §3 — does not exist in this database at all).

---

## 14. Temporal intelligence

**NOT IMPLEMENTED.** Directly tested against the live data:

- `published_at` / `effective_from` / `effective_until` / `superseded_at`: no such columns exist in the schema at all.
- `retrieved_at`: exists (`sources.retrievedAt`, `documents.retrievedAt`) and is populated.
- `version` / `edition`: `standards.editionYear` column exists but is **0/51 populated**.

Can the system answer:
- *"What is the current standard?"* — Only in the narrow sense that it returns whatever single edition happens to be in the corpus; it has no notion of "current" vs. "superseded" beyond the query-time conflict-detection heuristic in §13, which only fires when multiple editions are simultaneously retrieved.
- *"What was applicable in 2022?"* — **Cannot be answered.** No date range exists on any standard.
- *"Which amendment is currently active?"* — **Cannot be answered.** No amendments table exists.

This is explicitly a data problem, not a code problem: the schema has the columns (`qcos.notificationDate`, `qcos.effectiveDate`) to eventually support the first two questions once real dates are populated; it has no columns at all for the third.

---

## 15. Confidence engine

- `src/lib/confidence.ts` — deterministic, computed from the grounding result plus supporting/limiting evidence signals (chunk diversity, multi-source corroboration, coverage gaps, conflicts).
- Bands (`high`/`medium`/`low`/`none`) are gated by `groundingState` **first**, then score — a deliberate design (documented in the code) to prevent a disqualified candidate from ever reporting a contradictory "medium confidence" alongside "insufficient_evidence."
- **Calibration**: `scripts/calibrate-confidence.ts`, run live during this audit, correctly reports **"calibration data insufficient: only 7 query result(s) with a real generation run (need at least 20)"** rather than fabricating a curve. This is the honest, correct behavior given the data available — but it also means there is currently no statistically meaningful confidence calibration for this system, full stop.
- Test coverage: 4 dedicated tests plus the 20 shared grounding-pipeline tests exercise confidence indirectly.
- Confidence is **not** LLM-generated at any point — the LLM never sees or influences this value; it is computed before the LLM is called and passed to it as a fixed fact.

---

## 16. LLM infrastructure

```
Application → Provider Adapter (src/lib/providers/) → LocalProvider | OpenRouterProvider(free) | OpenRouterProvider(paid) → NormalizedLLMResponse
```

| Aspect | Status |
|---|---|
| Providers supported (code) | 3: `local` (any OpenAI-compatible `/chat/completions` endpoint), `openrouter-free`, `paid` (paid tier is architecturally identical to free — same OpenRouter integration, different env-var prefix/model) |
| Fallback order | Configurable via `LLM_PROVIDER` env var; default `auto` = local → openrouter-free → paid |
| Timeout | `LocalProvider`: 15s (`AbortController`). OpenRouter path: relies on the underlying `ai` SDK's own default — **no explicit timeout set in `OpenRouterProvider`**, a real gap. |
| Cooldown | 60s per-provider cooldown after a failure, in-process only (resets on redeploy), verified by reading `router.ts` |
| Retry | None — a failed call moves to the next provider rather than retrying, a deliberate cost-control choice |
| Structured output | Explicit allowlist (`openai/gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`) for OpenRouter; **assumed false by default** for every other model and for the local provider unless an operator explicitly opts in via env var |
| Token/context limits | OpenRouter: 128K reported context (not independently verified against the actual configured model); Local: 8192 assumed, not measured |
| Failure handling | Every provider call returns a normalized `{error}` field rather than throwing — confirmed by reading both provider implementations; callers never need exception handling for provider failure |
| Evidence-only fallback | `buildEvidenceOnlyAnswer()` in `answer.ts` — confirmed real, produces a deterministic templated response when every provider fails or is unconfigured |

### Which providers have ANY live-success evidence

- **OpenRouter (`openai/gpt-4o`), intent extraction**: Live success confirmed — `docs/ML_ENGINE.md` documents 3 real successful calls in a specific session, and `data/evaluation/generation-results.json` contains **7 real successful full end-to-end generation runs** (both the intent call and the `generateAnswer` prose call) with `httpStatus: 200, error: null`, plus one further attempt that failed specifically on credit exhaustion (not a code error). This is real, verifiable evidence.
- **This directly contradicts a line in `docs/PROJECT_STATUS.md`** ("every live `generateAnswer()` call this session failed") — that statement is true only for the specific session it was written in; the *project's overall history*, per its own committed evaluation artifacts, includes real successful `generateAnswer()` executions. Both statements are technically accurate for their own scope, but presented without qualification either one is misleading. **Correct composite statement: `generateAnswer()` has succeeded live 7 times on record; every attempt in later sessions has failed due to OpenRouter free-tier credit exhaustion; current live status as of this audit is NOT VERIFIED** (no live call was attempted during this audit, per the task's "do not implement/execute unnecessary work" instruction combined with the explicit prior "don't waste credit" instruction found in the scripts' own comments).
- **Local provider (Ollama or equivalent)**: **NOT VERIFIED, ever.** No file, log, test output, or doc anywhere in this repository shows a successful local-provider call. `docs/PROJECT_STATUS.md` itself lists this as `PLANNED — Never tested against a real local server this session` and no later session's docs contradict that. The code path is unit-tested with mocks (`provider-architecture.test.ts`, 23 tests) but mocks cannot verify a real local model actually returns the expected format.
- **Vercel AI Gateway** (the default embedding backend when `OPENROUTER_API_KEY` is absent): blocked on `customer_verification_required` in every session's own docs — **NOT VERIFIED working, ever.**

---

## 17. Model routing

Current routing is **provider-based only** (fixed chain order + cooldown). It is NOT capability-based beyond the binary structured-output allowlist, NOT task-based, NOT cost-based, NOT latency-based.

The query planner (built this session) computes a `complexity` tier (`SIMPLE`/`MODERATE`/`COMPLEX`) and a `requiresLLM` boolean per query — exactly the signal a task-based router would need — but **this is not wired into the provider-selection logic at all**. Every query that reaches the LLM stage today gets the identical treatment regardless of complexity, aside from the pre-existing exact-identifier fast path in `intent.ts` (which is a separate, older mechanism, not the new planner).

Desired-vs-actual:

| Desired | Actual |
|---|---|
| Exact lookup → deterministic | ✅ Matches (via `intent.ts`'s own fast path, not the newer planner) |
| Classification → small/local model | ❌ Not implemented — classification (intent) always uses the same full chain |
| Planning → local/free structured-output model | ❌ The new query planner is 100% deterministic (no LLM at all), which is stronger than the desired architecture in one sense (zero cost, zero failure mode) but means there's no LLM-assisted planning fallback for genuinely ambiguous queries |
| Synthesis → strongest available model | Partially — the fixed chain does put "paid" last, but selection is availability-order, not a deliberate cost/quality tradeoff decision per query |

---

## 18. Agent / orchestration

**An agent exists.** `src/lib/agent/orchestrator.ts`, built this session. Report per the task's own required fields:

- **Tools**: 8, from `src/lib/tools/` (`resolveStandard`, `getStandard`, `searchStandards`, `findApplicableStandards`, `checkMandatoryStatus`, `findQCO`, `getCertificationScheme`, `compareStandards`) — every tool returns `{status: "ok" | "not_found" | "error"}`, never fabricates.
- **Planner**: the deterministic query planner (§7) — tool selection is derived from plan type, not from an LLM choosing a tool.
- **Iteration limit**: hard-coded `MAX_ITERATIONS = 3`.
- **Stop conditions**: `required_evidence_covered`, `max_iterations`, `no_useful_new_evidence`, `no_tools_for_plan` — all four confirmed by reading the code and by this session's own live smoke test output.
- **Evidence threshold**: implicit — "covered" means every planned task has been attempted, not a scored sufficiency threshold.
- **Failure behavior**: a tool returning `not_found` or `error` does not crash the loop; it's recorded and the loop proceeds/stops per the conditions above.
- **Unnecessary-call prevention**: identifier-dependent tools (e.g. `checkMandatoryStatus`) are held back until a candidate identifier is known, preventing wasted calls with no usable argument.

**Critical caveat, found and must not be glossed over**: this orchestrator is **not called by any live API route**. `/api/v1/query` still runs its own, separate, older pipeline (`normalizeQuery → extractQueryIntent → retrieveChunks → aggregateEvidence → …`) that does not use the query planner, the tool registry, or this orchestrator at all. The agent is real, tested (8 unit tests with an injected fake executor + a live smoke script against the real DB and real tools), and functionally correct in isolation — but it currently has **zero effect on what a real user of the application experiences**. This is not "an agent that doesn't work" — it is "a working agent that nothing calls."

This is also, correctly, NOT an autonomous multi-agent system — it is a single bounded orchestrator with a hard iteration cap and no LLM inside the loop at all (tool selection is 100% deterministic). This matches the task brief's own recommendation to avoid uncontrolled multi-agent architecture.

---

## 19. Answer generation

```
Query → Evidence (deterministic) → Grounding (deterministic) → Confidence (deterministic) → LLM (prose only) → Validation (deterministic) → Final Answer
```

- The LLM receives exactly the pre-computed evidence package: candidate standards with their already-final `groundingState`, `coverage`, and text chunks — confirmed by reading `buildPrompt()` in `answer.ts`.
- It cannot introduce a new standard number: `validateRecommendationExplanations()` checks every `standardNumber` the model returns against the engine's own candidate set and silently drops anything not on that list — tested with 10 hostile/malformed cases, including "the LLM invents a standard number with an empty candidate list," which is fully rejected.
- It cannot change `groundingState` or `confidence` — these fields do not exist in `LLMAnswerSchema` at all (confirmed structurally, not just by instruction — there is no field for the model to even attempt to set).
- Unsupported claims in the free-text prose fields (`answer`, `certificationNotes`, `testingNotes`) are **not automatically removed** — only instructed against in the system prompt. This is the one place in the pipeline where "the LLM must not be the source of truth" relies on instruction-following rather than a structural guarantee.
- Output is validated for standard-number provenance (above) and passes through Zod schema validation (`LLMAnswerSchema`) before use — a malformed response fails outright rather than being partially trusted (tested).

---

## 20. Citation system

- **Source**: every citation comes from a real `RetrievedChunk` (chunkId, documentId, section, clause, page, sourceUrl) — never LLM-authored text.
- **Format**: JSON objects with the fields above, rendered by the frontend into evidence panels (not audited visually in this pass — code-level only).
- **Page/section support**: section/clause fields are populated when the source document had them; `page` is currently null for all 142 chunks in the live corpus (see §3).
- **Invalid citation detection**: `validateRecommendationExplanations()` — the LLM cannot attach a citation to a standard number that isn't a real candidate.
- **Citation mismatch detection**: `data/evaluation/validation-results.json` shows a live, direct-DB-lookup check (not LLM self-report) of every citation from the 7 tested queries — **21/21 valid**.
- **Known weakness**: this is a system-level guarantee (a citation always points to a real chunk from a real document), not a claim-level guarantee (nothing verifies that the specific chunk cited actually supports the specific sentence next to it in the LLM's prose — that would require sentence-level attribution, which does not exist).

---

## 21. Evaluation

### Current Evaluation Summary

| Area | Tests | Passed | Failed | Coverage | Confidence |
|---|---:|---:|---:|---:|---|
| Unit/integration (vitest, `npm run test:unit`) | 196 | 196 | 0 | Broad — covers standards-id, query-normalization*, coverage-analysis, conflict-detection*, grounding*, confidence*, evidence-aggregation*, provider architecture, knowledge-graph, tool registry, agent orchestrator, certification-schemes, API routes, UI components | High — re-run live this audit |
| Deterministic ML pipeline scripts (`npm run test:ml`) | 45 | 45 | 0 | query-normalization (8), evidence-aggregation (7), grounding-pipeline (20), answer-schema-validation (10) | High — re-run live this audit |
| Retrieval golden-query eval (`npm run eval:retrieval`) | 20 queries (12 recall cases + 8 negative cases) | 12/12 + 8/8 | 0 | Retrieval layer only, no LLM | High — re-run live this audit against the dev server |
| Generation-layer golden-query eval | 20 queries defined | **7 actually run live** (35%) | 0 of the 7 that ran | Only exact/messy-identifier + 2 adversarial cases have live coverage; comparison, testing, certification, natural-language-medium-confidence cases (Q07-Q10, Q14-Q18, Q20) are untested live | Medium — real but partial, credit-limited |
| Confidence calibration | N/A | N/A | N/A | Explicitly reports "insufficient data" (7/20 minimum-20 required) | High confidence *in the honesty of the null result*, zero confidence in any calibration curve, because none exists |

\*some of these files' tests are shared across multiple `test:ml` scripts as noted above; counted once.

**Combined total of independently-run, passing automated checks this audit: 196 + 45 = 241.**

---

## 22. Golden query dataset

- **Number of queries**: 20.
- **Categories** (12): exact_identifier, messy_identifier, part_section, natural_language, ambiguous_product, unsupported_query, evidence_question, comparison, certification, testing, prompt_injection, hallucination_trap.
- **Positive cases**: 12 (have an `expectedStandardIds` with at least one entry).
- **Negative/hard-negative cases**: 8 (`retrievalHardNegative: true` or an empty expected-ID list with `requiresEvidence: false`).
- **Adversarial cases**: 3 (prompt_injection ×1, hallucination_trap ×2) — of these, 2 have been tested live end-to-end (Q12 tested per the label but is actually `unsupported_query`; the true adversarial live-tested set per `GENERATION_BASELINE.md` is Q12 and Q19, both correct refusals). Q13, Q18, Q20 remain untested live.
- **Multilingual cases**: **0.** Every single query in the dataset is English.
- **Version/edition cases**: 2 (`part_section` category, both explicitly designed to test that a real-looking-but-absent identifier doesn't force a false match; not a "current vs. superseded edition" temporal test, since no temporal data exists to test against).
- **Citation cases**: not a separate category, but 14 of the 20 have `requiresCitation: true`.

**Is 20 queries sufficient?** No, by the project's own stated targets — `docs/ui/SIH.md`'s evaluation section calls for a 100-query minimum with specific category quotas. At 20 queries, and with only 7 ever exercised through the full live generation pipeline, no metric in §21 above (retrieval recall, citation validity, grounding accuracy) can be treated as statistically representative of real-world performance — they are useful regression guards for the exact 4-document corpus, not a claim about the system's general accuracy.

**Recommended next target: 100 queries**, matching the project's own pre-existing target (not the 500/1000+ options), because: (a) it's the documented next milestone already agreed in this project's spec, (b) it's achievable without paid infrastructure (the retrieval-layer eval costs nothing; only the generation-layer eval needs LLM credit, and 100 well-chosen queries is a realistic amount to eventually run against a topped-up free-tier balance), and (c) going straight to 500-1000 before the underlying corpus grows past 4 documents would mostly test the same tiny corpus repeatedly rather than add real signal.

---

## 23. Security

| Defense | Status | Evidence |
|---|---|---|
| Prompt injection via retrieved document content | Present, prompt-level only | `answer.ts`'s system prompt wraps every evidence chunk in `<source_document>...</source_document>` tags and explicitly instructs the model to treat that content as data, never as an instruction. Confirmed by reading the actual prompt text. |
| Automated test of the above | **NOT VERIFIED** | Q18 in the golden set tests a prompt-injection-*styled user query* ("ignore your previous instructions..."), which is a different attack surface (user input, not document content) — and even that has only been tested at the retrieval layer, per `GENERATION_BASELINE.md` showing Q18 as one of the 13 untested-live cases. There is no chunk in the current 4-document corpus containing an actual injected instruction, so the `<source_document>` defense itself has never been exercised against a real adversarial document. |
| Fake/fabricated standard number resistance | Tested and verified live | Q19 (`IS 99999:2099`) ran live end-to-end and correctly returned no fabricated standard, per `validation-results.json` (`falseStandardDetected: false`, `failureMode: NONE`). |
| Citation manipulation resistance | Tested (unit + live) | §20 above — 10 unit tests + 21/21 live citation validity. |
| Model jailbreak attempts | Not tested | No dedicated jailbreak test case exists in the golden set beyond the one prompt-injection-styled query. |
| Instruction injection inside retrieved documents specifically | Not tested (no such document exists in the corpus) | See above. |
| SQL injection / arbitrary code execution via tools | Defended by design | All tool inputs are Zod-schema-validated before execution (`src/lib/tools/registry.ts`); no tool exposes raw SQL or filesystem access to any LLM. |

**Gap**: the single most important untested claim in this entire report is whether the `<source_document>` defense actually works against a real document containing a real injected instruction, under a real LLM call. No such test exists.

---

## 24. Performance

No formal benchmarking exists. What can be reported:

- `query_logs.latencyMs` is a real column, populated for 18 real logged queries — but no aggregate analysis (p50/p95, etc.) of these 18 rows was found in any doc or script, and computing one from 18 samples would not be meaningful.
- No ingestion-time, embedding-time, or reranking-latency measurement exists as a standalone metric anywhere.
- No database query-performance profiling was found (e.g. `EXPLAIN ANALYZE` output).
- **Identified likely bottleneck** (not measured, inferred from architecture): the live `/api/v1/query` route makes up to 2 sequential LLM calls (intent, then answer) plus 2 sequential DB round-trips inside `retrieveChunks` (semantic + keyword, though these could be parallelized) — no request-level timing breakdown exists to confirm where time is actually spent.

---

## 25. Cost

- **Local inference**: never exercised (§16) — effectively $0 spent, $0 proven value.
- **OpenRouter free tier**: the only tier with any live-usage evidence; `docs/ML_ENGINE.md` records a lifetime usage figure of $0.116 as of the session that wrote it — this repo's own docs, not independently re-verified this audit (would require live API access to OpenRouter's billing, out of scope for a code/DB audit).
- **Paid API**: no evidence of any paid-tier call ever being made.
- **Embedding costs**: 142 embeddings generated via the same OpenRouter account; negligible at this scale (`text-embedding-3-small` is OpenAI's cheapest embedding model).
- **Database costs**: Neon Postgres — plan tier NOT VERIFIED (not something a code audit can determine).
- **Expected cost/query**: NOT VERIFIED — no per-query cost tracking exists in `query_logs` or anywhere else (the `NormalizedLLMResponse` type does carry `inputTokens`/`outputTokens`, so the raw data to compute this exists per-call, but nothing aggregates or persists it).
- **Unnecessary LLM calls identified**: none found to be structurally unnecessary — the deterministic fast paths (exact-identifier intent, evidence-only fallback) already exist specifically to avoid calling an LLM when it isn't needed. The gap is the opposite: the query planner's complexity signal, which could further reduce/route calls, exists but isn't wired in (§17).
- **Cheapest architecture that preserves current quality**: exactly what exists today for deterministic-only queries (0 LLM calls for exact-ID lookups); the recommendation is to actually wire in the already-built query planner's `requiresLLM`/complexity signal to the provider chain so `SIMPLE` non-identifier queries could also skip or downgrade the LLM call, which is not happening today.

---

## 26. Multilingual

- **English**: full support, throughout.
- **Hindi**: UI chrome only (`src/lib/i18n.ts` — navigation, hero copy, footer, placeholder-page text) — a real, hand-translated dictionary, not machine-translated per its own code comment ("only English and Hindi are actually translated... rather than shipping guessed/machine translations of technical BIS terminology"). **This does NOT extend to query understanding, retrieval, or LLM prompts** — a Hindi-language question would go through the exact same English-only `standards-id.ts` regex, English-only Postgres FTS (`to_tsvector('english', ...)`), and an English-only LLM system prompt.
- **Hinglish**: **NOT IMPLEMENTED, not tested, no code path for it.**
- **Indian terminology handling**: only what naturally falls out of the English `standards-id.ts` resolver (e.g. "Indian Standard 14543" as an alternate phrasing of "IS 14543") — this is real and tested, but it is English-language terminology variation, not multilingual support.
- **Multilingual retrieval**: **NOT IMPLEMENTED.** Zero of the 20 golden queries are non-English (§22).

**Claim that must not be made**: "multilingual support" without immediately qualifying it as "UI chrome only, English/Hindi, does not extend to search or answers."

---

## 27. Current architecture diagram

```
                              USER
                               │
                               ▼
                   QUERY NORMALIZATION            [IMPLEMENTED]
                               │
                               ▼
              ┌────────────────────────────────┐
              │  INTENT (deterministic fast     │  [IMPLEMENTED — fast path]
              │  path for bare IDs, else 1 LLM  │  [PARTIAL — LLM-dependent
              │  call, else keyword fallback)   │   free-text extraction]
              └────────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │   QUERY PLANNER (14 plan types, │  [SCAFFOLDED — built, real,
              │   complexity tiers)             │   tested, NOT called by the
              │                                 │   live API route]
              └────────────────────────────────┘
                               │           (query planner's output is
                               │            currently discarded — the
                               │            live route does not use it)
                               ▼
                    HYBRID RETRIEVAL                [IMPLEMENTED]
              (semantic + keyword + identifier,
                   fused via RRF)
                               │
                               ▼
              ┌────────────────────────────────┐
              │  DOCUMENT-DIVERSITY "RERANKER"  │  [IMPLEMENTED as a
              │  (deterministic algorithm,      │   deterministic algorithm —
              │   NOT a trained ML model)       │   NOT ML/trained]
              └────────────────────────────────┘
                               │
                               ▼
                  EVIDENCE AGGREGATION              [IMPLEMENTED]
                               │
                               ▼
                  COVERAGE ANALYSIS                 [IMPLEMENTED]
                               │
                               ▼
                  CONFLICT DETECTION                [PARTIAL — regex heuristics
                               │                      only, no temporal conflicts]
                               ▼
                      GROUNDING                      [IMPLEMENTED, deterministic]
                               │
                               ▼
                      CONFIDENCE                     [IMPLEMENTED, deterministic,
                               │                       uncalibrated]
                               ▼
              ┌────────────────────────────────┐
              │  LLM ANSWER (prose only)        │  [PARTIAL — works when a
              │                                 │   provider is available AND
              │                                 │   funded; evidence-only
              │                                 │   fallback otherwise]
              └────────────────────────────────┘
                               │
                               ▼
                CITATION/STANDARD VALIDATION        [IMPLEMENTED]
                               │
                               ▼
                          ANSWER

  ┌─────────────────────────────────────────────────────────────┐
  │  BUILT BUT DISCONNECTED FROM THE ABOVE LIVE PATH:            │
  │  DOMAIN TOOL REGISTRY (8 tools)         [IMPLEMENTED, tested]│
  │  BOUNDED AGENT ORCHESTRATOR             [IMPLEMENTED, tested]│
  │  These exist, work in isolation (unit + live-smoke tested), │
  │  and are called by nothing in the live application.         │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │  KNOWLEDGE GRAPH: schema + write-time validator exist.       │
  │  0 relationship rows. No graph retrieval code.  [SCAFFOLDED] │
  └─────────────────────────────────────────────────────────────┘
```

---

## 28. Completion score

| Category | Weight | Score | Weighted |
|---|---:|---:|---:|
| Data | 10% | 35% | 3.5 |
| Ingestion | 10% | 25% | 2.5 |
| Retrieval | 15% | 70% | 10.5 |
| Query Intelligence | 10% | 55% | 5.5 |
| ML/Reranking | 10% | 15% | 1.5 |
| Knowledge Graph | 10% | 15% | 1.5 |
| Evidence/Grounding | 15% | 65% | 9.75 |
| LLM Infrastructure | 10% | 40% | 4.0 |
| Evaluation | 5% | 45% | 2.25 |
| Observability/Security | 5% | 20% | 1.0 |
| **Total** | **100%** | | **42.0** |

## Overall AI/ML Completion: 42%

**Why not higher**: the deterministic core (retrieval, evidence, grounding, confidence, citation validation) is genuinely strong and well-tested — that's most of the 42 points. But the categories that define whether this is actually an *intelligence* system rather than a well-engineered search box — knowledge graph (15%), temporal intelligence (0% measured, folded into Data/Evidence above), true ML reranking (15%, i.e. mostly absent as "ML"), and a connected agent (0% credit given here since it's unwired) — are all thin or disconnected.

**Why not lower**: nothing in this report is vaporware. Every component marked IMPLEMENTED has passing tests re-run during this audit or live database/API evidence. The gap between 42% and "production ready" is real missing work (more data, wired-in orchestration, populated relationships, calibration data), not misrepresented existing work.

---

# BLOCKERS

| Blocker | Severity | Impact | Fix | Effort |
|---|---|---|---|---|
| Corpus is 4 documents | P0 | Every retrieval/grounding/confidence number is only meaningful for this tiny corpus | Ingest more real BIS documents (415 candidate URLs already discovered, none downloaded) | High |
| `relationships` table has 0 rows | P0 | No knowledge-graph capability exists in practice despite the schema | Build a real extraction script with the existing evidence-required validator | Medium-High |
| Query planner + tool registry + agent orchestrator are unwired | P0 | All of Phase 1-2 of this session's own "Intelligence Engine" work has zero effect on real users | Wire `runAgent`/the planner into `/api/v1/query` (or a new route) | Medium |
| OpenRouter free-tier credit exhaustion (recurring) | P1 | Blocks 65% of the golden generation-layer eval from ever running; blocks calibration | Fund a small paid balance, or get local inference actually working | Low (money) / Medium (local setup) |
| Local/Ollama provider never tested live | P1 | The entire "zero-cost floor" of the architecture is unproven | Stand up a real local server once and run the existing test suite against it | Low-Medium |
| 0/46 QCOs and 0/51 standards have any real date | P0 | Temporal intelligence (§14) is structurally impossible right now, and this was explicitly requested by the user this session | Real per-QCO primary-source date lookup | High (manual research) |
| 26/51 standards are `needs_review`, sourced from an upstream dataset with documented recurring fabrications | P1 | Any answer touching one of these 26 standards is currently built on unverified BIS facts | Independently verify each against a primary bis.gov.in source | High (manual research) |
| No table/laboratory/committee/amendment entities exist | P1 | Several core-journey steps (testing labs, amendments) are structurally unanswerable, not just unpopulated | Schema + real data source needed for each | High |
| No per-sentence grounding check on LLM free-text prose | P2 | Instruction-following is the only defense against an unsupported claim slipping into the readable answer text | Would require sentence-level attribution — a real engineering project on its own | High |
| No observability/tracing beyond a single `query_logs` table | P2 | Debugging a bad answer in production would be slow and manual | Add structured per-stage logging | Medium |

---

# TECHNICAL DEBT

- **Heuristics presented as more sophisticated than they are**: the "ML reranker" is a fixed round-robin algorithm with a hand-picked constant (0.7), not a trained model. The project's own naming convention throughout its docs calls this "ML reranking" — this report corrects that framing but the naming persists in the codebase/docs.
- **Duplicated certification data**: `certification_schemes`/`qcos` DB tables and the JSON-backed `certification-schemes.ts` reference file represent overlapping facts through two different paths; `getCertificationScheme` (the new tool) intentionally uses the JSON path, not the DB table, because the DB table has no direct standard FK — this is a known, documented, unresolved duplication.
- **Two separate "is this the same base standard" implementations**: `conflict-detection.ts`'s `baseStandardNumber` (now exported and reused by `comparison-tools.ts`) vs. `standards-id.ts`'s full identifier resolver — related but distinct regexes maintained separately.
- **`documents.standardId` has no Drizzle `relations()` wiring** — a plain UUID column, joins must be written manually (noted directly in the schema's own comment).
- **No versioned migrations** — the project uses `drizzle-kit push` exclusively; a `drizzle-kit generate` was attempted once and produced a dangerous migration file that would have re-created existing tables, then was deleted. This is a real operational risk if anyone runs `generate` again without knowing this history.
- **Weak/absent evaluation for 65% of the golden generation set** — see §22.
- **Missing provenance for the 26 `needs_review` standards** beyond "we don't trust upstream's own verification claim" — no independent primary-source check has actually been performed for any of them yet.
- **No temporal logic at all**, not even scaffolding — this is a schema gap, not just a data gap, for anything beyond QCO notification/effective dates.
- **Provider limitations**: `OpenRouterProvider` has no explicit request timeout (relies on the underlying SDK default, unverified value); `LocalProvider`'s structured-output support is a manual opt-in flag with no runtime verification that the configured model actually honors it.
- **Untested integrations**: local LLM inference, the Vercel AI Gateway path, and 13/20 golden generation queries are all, in different ways, integration paths that exist in code but have never been exercised end-to-end successfully.

---

# VERIFIED WORKING

- Hybrid retrieval (semantic + keyword + identifier boost, RRF fusion) — 12/12 recall, 8/8 no-false-match, re-run live this audit.
- Deterministic document-diversity reranking algorithm — measured, documented before/after fix for its one target failure case.
- Evidence aggregation, coverage analysis, conflict detection, grounding, confidence — all deterministic, all with passing unit tests re-run this audit (45 `test:ml` + relevant portions of the 196 vitest tests).
- Exact-standard-identifier lookup with zero LLM dependency.
- Deterministic evidence-only fallback answer when no LLM provider is available.
- `generateAnswer()` LLM prose synthesis — has succeeded live 7 times on record (real `httpStatus: 200` responses in `data/evaluation/generation-results.json`), with 21/21 citations independently validated against the live database.
- Citation/standard-number validation rejecting LLM-invented standards — unit-tested with 10 adversarial cases and live-validated on the 7 real runs.
- Idempotent standards/QCO/certification-scheme migration (`data-migrate-existing.ts`) — verified live, zero duplicates on re-run.
- The domain tool registry (8 tools) and bounded agent orchestrator — both function correctly in isolation, verified via unit tests and live smoke scripts against the real database.
- The verification-status UI distinction (green "Verified" vs. amber "Needs review") on the certification page and Standard Passport page — fixed and tested this session after being found to misrepresent unverified data.

---

# VERIFIED NOT WORKING / BLOCKED

- Knowledge-graph relationship extraction — no script exists; 0 rows.
- Graph retrieval (`getNeighbors`, `findPath`, etc.) — no code exists.
- Temporal intelligence — no real dates exist for any standard or QCO.
- Local/Ollama LLM inference — never successfully tested, anywhere, in this repository's history.
- Vercel AI Gateway (default embedding path) — blocked on account verification every session it's been attempted.
- 13/20 golden generation-layer queries — never run live, blocked by OpenRouter credit exhaustion.
- Confidence calibration — explicitly, correctly reports insufficient data.
- Laboratory discovery, amendment tracking, committee data — no schema, no data, not started.
- Query planner / tool registry / agent orchestrator integration into the live app — built, tested, and completely unused by any real request path.

---

# CLAIMS WE MUST NOT MAKE

- "AI understands all BIS standards" — it has ingested 4 documents.
- "All BIS standards are indexed" — 51 standards exist as metadata rows; only 4 have any actual retrievable document text; the true universe of Indian Standards numbers in the tens of thousands.
- "Real-time BIS information" — the corpus is a static ingest; no live BIS feed exists.
- "All laboratories are covered" — zero laboratories exist in the system at all.
- "All QCOs are available" — 46 QCO records exist, 25 of them unverified, against an unknown but certainly larger real universe of mandatory QCOs.
- "100% accurate" — 26/51 standards and 25/46 QCOs are explicitly `needs_review`, i.e., not asserted as accurate by this system itself.
- "Production-ready" — see §36.
- "Multilingual support" without qualifying it as UI-chrome-only, English/Hindi, not extending to search or generation.
- "ML-powered reranking" without qualifying that it is a deterministic algorithm, not a trained model.
- "Knowledge graph" without qualifying that it currently has zero edges.
- "Agent-powered" or "intelligent orchestration" as a description of the live product — the real orchestrator exists but is not connected to anything a user can reach.
- "Calibrated confidence scores" — confidence is a real, deterministic, tested signal, but explicitly uncalibrated against real-world outcomes (insufficient data, honestly reported by the system's own calibration script).

---

# ROADMAP

### P0 — Critical

| Task | Reason | Files/modules | Dependency | Difficulty | Impact | Acceptance criteria |
|---|---|---|---|---|---|---|
| Wire the query planner + tool registry + agent orchestrator into `/api/v1/query` | All of this session's Intelligence Engine work currently affects nothing real | `src/app/api/v1/query/route.ts`, `src/lib/agent/orchestrator.ts` | None — all pieces already exist and are tested | Medium | High — makes existing, tested work actually load-bearing | A real request through `/api/v1/query` visibly uses planner-selected tools; retrieval regression (12/12, 8/8) still passes |
| Real relationship extraction for at least one edge type | The knowledge graph is currently schema-only | New `scripts/data-relationships.ts` | `standards`/`qcos` data (exists) | Medium | High — first real graph data point | At least one `STANDARD_HAS_CERTIFICATION_SCHEME` edge exists with real evidence, passes `validateRelationshipCandidate` |
| Independently verify the 26 `needs_review` standards | Currently built on an upstream source with a documented fabrication pattern | `data/bis-standards-dataset/qco-standards.json` | Manual primary-source research | High | High — trust of nearly half the reference dataset | Each of the 26 has either a `verified_accurate`/`corrected` status with a real primary-source URL, or stays `needs_review` with a specific reason |
| Grow the corpus past 4 documents | Every quality metric in this report is only meaningful at this scale | `scripts/ingest.ts`, the 415 already-discovered candidate URLs | Legal/ToS review of redistribution not yet done | High | Very high — foundational | At least 20-30 real documents ingested with real chunks/embeddings |

### P1 — Important

| Task | Reason | Files/modules | Dependency | Difficulty | Impact | Acceptance criteria |
|---|---|---|---|---|---|---|
| Test local (Ollama) inference for real, once | Zero-cost floor of the architecture is currently unproven | `src/lib/providers/local-provider.ts` | A running local model server | Low-Medium | Medium — de-risks the whole "works with $0 budget" claim | One real successful `generateText`/`generateStructured` call logged |
| Fund/obtain OpenRouter credit and re-run the remaining 13 golden generation queries | Only 35% of the generation-layer golden set has ever run | `scripts/eval-generation.ts` | Small amount of credit | Low | Medium — completes existing eval infrastructure | 20/20 golden queries have a recorded live result |
| Wire query-planner complexity into model routing | Currently computed and discarded | `src/lib/query-planner.ts`, provider router | The P0 wiring task above | Medium | Medium — real cost/latency reduction | SIMPLE non-identifier queries measurably skip or downgrade the LLM call |

### P2 — Advanced

- Laboratory/committee/amendment schema + data.
- Sentence-level grounding/attribution for free-text prose.
- Structured observability (per-stage timing, request IDs).
- Expand the golden dataset toward 100 queries with real category quotas.

### P3 — Research

- True learned reranking (would require real training data, which does not exist yet — premature before the corpus grows).
- Hindi/Hinglish query understanding and retrieval (not just UI chrome).
- Formal confidence calibration once 20+ live generation results exist.

---

## 30/60/90 day plan

### Next 30 days — Foundation + data + retrieval + evaluation
- Ingest a meaningfully larger real document corpus (target: 20-30 documents) from the already-discovered candidate URLs.
- Independently verify or correct the 26 `needs_review` standards.
- Wire the existing query planner/tool registry/orchestrator into the live query path.
- Re-run the full golden set (retrieval + generation) against the larger corpus; expand the golden set toward 50 queries.

### 31-60 days — Knowledge graph + temporal intelligence + reranking + better evidence
- Build the first real relationship-extraction script (start with `STANDARD_HAS_CERTIFICATION_SCHEME`, since the underlying data already exists).
- Begin populating real QCO effective/notification dates from primary sources.
- Evaluate whether the deterministic reranker's fixed constants still hold at the larger corpus size; only consider a trained reranker once there's enough real query/relevance data to train on.
- Expand golden set to 100 queries, matching this project's own pre-existing target.

### 61-90 days — Advanced ML + agent orchestration + multilingual + production hardening
- Extend relationship extraction to a second edge type (e.g. `STANDARD_APPLIES_TO_PRODUCT`).
- Get one real local-inference test running and documented.
- Decide, with real usage data, whether Hindi query understanding (not just UI) is worth the investment.
- Add structured observability (per-stage timing) before considering any production launch claim.

This is intentionally conservative for a small/low-budget team — it does not assume paid infrastructure, a dedicated ML team, or a data-labeling budget appearing.

---

# AI/ML STATUS SCORECARD

| Component | Status | Completion | Confidence |
|---|---|---:|---|
| Data | PARTIALLY IMPLEMENTED | 35% | High (counts verified live) |
| Ingestion | PARTIALLY IMPLEMENTED | 25% | High |
| Chunking | IMPLEMENTED | 80% | High |
| Embeddings | IMPLEMENTED (at current scale) | 90% | High — 142/142 verified live |
| Retrieval | IMPLEMENTED | 70% | High — re-run live this audit |
| Reranking | IMPLEMENTED (as a heuristic, not ML) | 15% (as "ML") / 70% (as a heuristic) | High |
| Query Intelligence | PARTIALLY IMPLEMENTED | 55% | High |
| Knowledge Graph | PARTIALLY IMPLEMENTED (updated same day, see "UPDATE" above — 50 real, provenance-carrying rows now exist via FK materialization; still no text extraction, no traversal API) | 30% | High |
| Evidence | IMPLEMENTED | 70% | High |
| Grounding | IMPLEMENTED | 65% | High |
| Conflict Detection | PARTIALLY IMPLEMENTED | 40% | High |
| Temporal Intelligence | NOT IMPLEMENTED | 5% | High |
| Confidence | IMPLEMENTED (uncalibrated) | 55% | High |
| LLM Infrastructure | PARTIALLY IMPLEMENTED | 40% | Medium — local path unverified |
| Agent | PARTIALLY IMPLEMENTED (updated same day, see "UPDATE" above — connected to `/api/v1/query` and live-verified; output not yet consumed by the LLM prose or the UI) | 40% in production | High |
| Evaluation | PARTIALLY IMPLEMENTED | 45% | High |
| Security | PARTIALLY IMPLEMENTED | 30% | Medium — key defense untested against a real adversarial document |
| Observability | SCAFFOLDED | 15% | High |

# OVERALL AI/ML COMPLETION

**~45%** (42% at initial audit; +~3 points from the same-day Knowledge Graph and Agent updates documented at the top of this report — see "UPDATE")

# BIGGEST ACHIEVEMENT

A genuinely deterministic evidence → grounding → confidence → citation-validation pipeline that keeps the LLM from being the source of truth — not as a slogan, but as a structural fact verified by: schema-level absence of grounding/confidence fields in the LLM's output type, 10 tests specifically trying to smuggle fabricated standard numbers past validation (all correctly rejected), and 21/21 live citation checks against the real database. This is the one part of the system that would hold up under adversarial scrutiny today.

# BIGGEST WEAKNESS

The knowledge graph, temporal intelligence, and the newly-built agent/planner/tool-registry layer are three separate pieces of real, tested infrastructure that currently do nothing for a real user — the graph has no data, temporal fields have no data, and the agent isn't called by the live route. The gap between "code that exists and passes tests" and "code that affects the product" is the single largest issue in this report.

# BIGGEST RISK

Treating the 26 `needs_review` standards (more than half the reference dataset) as reliable in any user-facing surface before they are independently verified — the upstream source they came from has now been caught fabricating the same specific fact (a false "2024 edition" of IS 14543) in three separate instances across this project's history, and there is no reason to assume the other 25 unverified entries are more reliable than the two that were already caught being wrong.

# NEXT 5 THINGS TO BUILD

1. ~~Wire the query planner + tool registry + agent orchestrator into the live `/api/v1/query` path~~ — **done same day, see "UPDATE" above.** Still open: make the LLM prose and the UI actually consume `toolEvidence`, not just receive it.
2. ~~A real relationship-extraction script for at least one edge type~~ — **done same day** (`STANDARD_HAS_PRODUCT_MANUAL`, `STANDARD_SUBJECT_TO_QCO`, 50 rows). Still open: text-based extraction (references, supersession, amendments) — everything done so far is FK materialization, not extraction from document prose.
3. Independent verification of the 26 `needs_review` standards against primary BIS sources.
4. Ingest a meaningfully larger real document corpus.
5. One real, logged local-inference test, to actually prove the project's own "$0 budget" architectural claim.

# PRODUCTION READINESS

**NOT READY.**

Why: the deterministic core is solid enough to demo honestly and would not embarrass the team in front of a technical reviewer who asked hard questions — but "production" implies real users relying on real answers about real BIS compliance obligations, and today: half the reference standards dataset is explicitly unverified, zero temporal/amendment data exists (so the system cannot correctly answer "is this still current"), the knowledge graph has no data, and the one real generation-layer eval that exists covers only 35% of even the small existing golden set. None of these are unfixable — several (wiring the orchestrator, extracting one relationship type) are days of work, not months — but none of them are done yet either.

---

# FINAL ENGINEERING VERDICT

**1. What the system can actually do today**: given a query that names an exact Indian Standard number already in its 4-document corpus, it will deterministically find the right document, correctly ground the answer as "verified," and (when an LLM provider is funded and available) produce accurate, citation-backed prose about it — with a solid fallback to an honest evidence-only response when no LLM is available. Given a natural-language product question, it does the same with somewhat lower but still measured confidence, using real hybrid retrieval, not keyword matching alone. Given a fabricated or absent standard, it correctly says so rather than inventing an answer — this has been tested and holds.

**2. What makes it technically strong**: the separation between "things a deterministic engine decided" and "things an LLM is allowed to phrase" is real, not aspirational — enforced at the type-schema level, not just by prompt instruction, and independently validated against live data. The reranker's failure-mode-driven design (fixing a measured, documented bug rather than a hypothetical one) reflects real engineering discipline. The provider-fallback architecture correctly treats "no LLM available" as a normal, tested code path rather than an outage.

**3. What is still missing**: real scale of ingested documents (4, not 100+); any populated knowledge graph (0 edges); any temporal/amendment data (0 real dates anywhere); a connected agent (built, but wired to nothing); and independent verification of roughly half the reference metadata dataset.

**4. What could fail in a real BIS deployment**: a user asking about one of the 26 `needs_review` standards would receive an answer built on an unverified — and, based on this project's own history with this specific upstream source, plausibly wrong — fact, with no visible warning inside the main query-answering flow (the `needs_review` distinction currently only surfaces in the separate certification-scheme reference browser's UI badge, not in the main `/api/v1/query` answer path, which doesn't consume that dataset at all in its current live wiring). A question about "is this still the current edition" or "what changed in the latest amendment" would be structurally unanswerable and, depending on how the LLM prose is phrased, could read as more confident than the underlying (nonexistent) data supports.

**5. What must be built next**: in order of leverage — connect the already-built planner/tools/agent to the live route; extract one real relationship edge type; verify the unverified half of the reference dataset; grow the document corpus. None of these require new architecture; all of them require finishing what's already started.

**6. Is the AI/ML architecture fundamentally sound, or does it need redesign?** **Sound — no redesign needed.** The core discipline (deterministic grounding, schema-enforced LLM output constraints, honest degradation when data or providers are unavailable) is the hard part to get right, and it is already right, verified by direct code and live-data inspection, not by trusting documentation. What remains is largely execution — more data, wiring existing components together, and finishing evaluation coverage — not a rethink of the approach.
