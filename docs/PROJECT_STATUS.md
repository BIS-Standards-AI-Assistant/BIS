# Project Status

Last updated: 2026-08-30. Categories: DONE, PARTIAL, BLOCKED, PLANNED — only
recording what was actually observed this session or in prior sessions'
verified work, never projected.

## Application

| Area | Status | Notes |
|---|---|---|
| Government-style navigation (7 sections, mega menus) | DONE | Verified visually; all placeholder routes load (never 404 for a real nav item) |
| Search overlay + `/search` page | DONE | Wired to real `/api/v1/search`; global search state-machine overhaul (suggestions, grouped results) NOT attempted — see "Not attempted this session" below |
| Homepage | DONE | Static hero (floating/glowing decorations removed this session — see below) |
| Standards browse/compare | DONE | Pre-existing, unaffected this session |
| Standard Passport (`/standards/[id]`) | DONE | Rebuilt this session — see below |
| Certification page (`/certification`) | DONE | Rebuilt in a prior session (discovery search + scheme explorer); this session added certification-relationship linking from the Standard Passport |
| Placeholder pages for unbuilt sections (Testing, Resources, e-Services, About BIS) | DONE | Honest "Coming soon" state, not fabricated content |

## Standard Passport rebuild (this session)

Replaced `src/app/standards/[id]/page.tsx`'s ad hoc evidence dump with a
real information-record layout: identity header, overview (only fields
actually present — no fabricated "Mandatory Active" status, which the
previous version hardcoded unconditionally), certification relationships
(cross-referenced against the real `data/bis-standards-dataset/
qco-standards.json` reference set via a shared `src/lib/
certification-schemes.ts` module — matches only on exact standard number,
never guesses across editions), a testing section (chunks matched against
the same `TESTING_KEYWORDS` pattern `coverage-analysis.ts` already uses,
exported for reuse rather than duplicated), an honest "related standards
not yet available" section (no relationship data exists in the schema),
and the evidence list. "Search in AI Assistant" was renamed "Ask about
this standard," routing to the homepage query flow instead of a separate
chat surface.

Verified live against the real database: a real ingested standard
(IS 14543:2016) renders all new sections correctly, the fabricated status
text no longer appears, and a standard with no matching certification
reference entry correctly shows the honest "not available" message rather
than a false positive.

**Known limitation**: the testing/evidence keyword split is a simple
regex match against chunk text, not true section classification — a
testing-heavy product manual (like IS 14543's) can have the majority of
its chunks classified as "Testing" because the underlying document
genuinely discusses sampling/testing throughout. This is a real match on
real text, not fabrication, but it's a coarse heuristic, not a proper
information-architecture parse.

## Knowledge graph foundation (this session, prompts/dataAcquisition.md)

A 45-section, multi-week data-engineering mission. This session built the
**foundation only** — schema, provenance model, one real (small) discovery
pass, and migration of already-verified data — not the full acquisition
pipeline. Nothing here was faked to look more complete than it is.

| Item | Status | Notes |
|---|---|---|
| Schema (`standards`, `sources`, `certification_schemes`, `qcos`, `relationships` tables) | DONE | Additive only — pushed to the live shared Neon DB (confirmed with the user first), existing `documents`/`chunks`/`query_logs` untouched |
| `src/lib/knowledge-graph.ts` (relationship-type vocabulary + anti-fabrication validator) | DONE | 10 tests — a relationship candidate with no source/document or empty evidence text is rejected outright, matching §43's "never fabricate a relationship" |
| `scripts/data-discover.ts` (Phase 1 discovery) | DONE, real | The only stage that touched the network this session. Verified live: bis.gov.in's certification-listing pages are JS/AJAX-rendered (confirmed by fetching one — no data in the static HTML), so discovery used BIS's own sitemap.xml instead (real, static, robots.txt-published). One real, rate-limited (politeFetch, 1.5s between requests) crawl found 415 genuine candidate URLs, written to `data/manifests/discovered-sources.json`, every one `needs_review` |
| `scripts/data-migrate-existing.ts` | DONE, real, idempotent | Migrated the 22 already fact-checked `qco-standards.json` entries and the 4 already-ingested seed documents into the new schema — 25 real `standards` rows, 3 certification schemes, 21 QCOs, all 4 documents linked. Re-ran twice live to confirm idempotency (0 duplicates second run) |
| `scripts/data-report.ts` | DONE, real | Generates `data/reports/coverage-report.md` from live DB counts — not projected numbers |
| Retrieval regression after schema/data changes | DONE | Re-ran live: still 12/12 recall, 8/8 no-false-match |
| PDF download/extraction (Phase 2+) | NOT ATTEMPTED | No PDFs downloaded or parsed this session |
| Amendment/revision graph, laboratories, committees, testing-facility matrix, domain taxonomy beyond existing `category` field | NOT ATTEMPTED | No tables or data exist for these yet |
| Relationship extraction (populating the `relationships` table itself) | NOT ATTEMPTED | Table exists and is validated (`knowledge-graph.ts`), but no script has inserted a single relationship row yet — `data-report.ts` correctly reports 0 |
| 100-question golden dataset (§36) | NOT ATTEMPTED | The existing 20-question `golden-queries.json` was not expanded — doing this well requires more standards with real evidence than the 25 currently migrated, and rushing it risks the exact "expected answer without real backing" problem this mission explicitly prohibits |

**Known limitation found while building this**: the discovery keyword
filter (`isRelevant` in `data-discover.ts`) is a coarse substring match —
verified live and covered by a test that it also matches unrelated pages
(e.g. a "World Standards Day" regional-office photo gallery, because its
URL slug contains "standards"). This is exactly why every discovered
source is `needs_review`, never auto-confirmed.

## Global search overhaul (this session, prompts/globalSearch.md — Milestone C)

Scoped to the search *overlay*'s typeahead, not a full grouped multi-vertical
results page (there isn't yet distinct indexed data for separate
Certification/Testing/Resources search verticals — building that grouping
would mean either empty categories or fabricated ones, both explicitly
prohibited by the prompt itself).

| Item | Status | Notes |
|---|---|---|
| Explicit search state machine (`src/lib/search-state.ts`) | DONE | Discriminated union (`empty/focused/typing/suggestions/no_results/offline`) replaces scattered booleans in `SearchOverlay` |
| Deterministic exact-identifier suggestions | DONE | Reuses `resolveStandardIds` directly (pure regex, no duplicate parser) — instant, no API call, no LLM |
| Real debounced typeahead (300ms) against `/api/v1/search` | DONE | Deduped to one suggestion per distinct standard; never fabricates a suggestion the API didn't return |
| Keyboard navigation (↑/↓/Enter) | DONE | Selecting a suggestion navigates straight to its Standard Passport |
| Global `/` shortcut to open search | DONE | Suppressed while focused in any input/textarea/contenteditable |
| Honest no-results typeahead state | DONE | "No matching BIS standards found... press Enter to search anyway" — never silently empty, never a fabricated result |
| `standards-id.ts` regression tests | DONE | Was flagged missing in the last two milestone reports; 12 tests added, including the exact Sec 6 / Sec 26 case named in the prompt |
| Grouped multi-vertical results page (Standards/Certification/Testing/Resources sections) | NOT ATTEMPTED | No separate indexed search verticals exist yet — the existing `/search` and homepage query flow already show certification/testing info per-standard via `RecommendationCard`/`CoveragePanel`/`ConflictPanel`, which this session did not duplicate into the overlay |
| Full accessibility/responsive/dark-mode audit passes | NOT PERFORMED | No browser tooling available this session |

**Known limitation, found while building this**: `/api/v1/search` (used for
typeahead) has no abstention behavior — unlike `/api/v1/query`'s
engine-derived grounding, hybrid semantic retrieval always returns *some*
nearest-neighbor candidates even for a nonsense query (verified live: a
deliberately fake product string still returned 5 results). The suggestions
never claim relevance/grounding/confidence for these — they only show the
standard number and title exactly as retrieved — but a very off-topic query
can still surface a loosely-related suggestion in the overlay. This is a
pre-existing property of `/api/v1/search`, not something this milestone
introduced, but it's now more visible because typeahead calls it on every
keystroke.

## Not attempted this session (scope explicitly deferred, not silently dropped)

- **Testing discovery page upgrade** — `/testing` remains the existing
  honest placeholder; no dedicated testing search/discovery UI was built.
- Dedicated responsive/accessibility/dark-mode audit passes — not
  performed this session (no browser tooling available); existing
  token/utility patterns were reused, which are already dark-mode-aware,
  but nothing was screenshot-verified at any breakpoint.

## Frontend fixes (this session)

| Issue | Status | Fix |
|---|---|---|
| Floating/glowing/rotating decorative elements (violated the project's own "no AI-slop" rule) | DONE | Removed `animate-float`, `animate-pulse-slow` blobs, `animate-rotate`, dead CSS keyframes |
| Header logo tilting on hover | DONE | Removed `group-hover:rotate-12` |
| Navigation reverted to dead `#anchor` links by an unrelated merge | DONE | Restored mega-menu wiring to real routes |
| Missing Government of India emblem | DONE | Added Ashoka Chakra to the government bar and footer; re-fixed after a subsequent merge silently reverted it back to the placeholder |
| Unused-import lint warnings (`WhatsNew.tsx`, `Footer.tsx`) | DONE | Cleaned up — `npm run lint` now reports zero warnings |

## ML / Intelligence engine

See `docs/ML_ENGINE.md` for full detail. Summary:

| Stage | Status |
|---|---|
| Query normalization, hybrid retrieval, reranking, evidence aggregation, coverage analysis, conflict detection, deterministic grounding, deterministic confidence, citation/standard validation | DONE — 45 unit/integration tests passing, live-smoke-tested against the real database |
| LLM answer synthesis (`generateAnswer`) | PARTIAL — schema round-trip verified via mocked responses; never successfully executed live this session (OpenRouter credit exhaustion) |
| Confidence calibration | BLOCKED | Correctly reports "calibration data insufficient" (7 real samples, need 20+) rather than fabricating a curve |
| Deterministic intent extraction (reducing the 2 LLM-calls/query to fewer) | PARTIAL | Exact-ID queries now skip the LLM entirely (`deterministicIntentFastPath`); general natural-language queries still use the LLM path when a capable provider is available |

## Provider-independent LLM architecture (this session)

See `docs/ARCHITECTURE.md` for full detail. `intent.ts`/`answer.ts` no
longer call an LLM SDK directly — both route through `src/lib/providers/`.

| Item | Status | Notes |
|---|---|---|
| Provider adapter (local / OpenRouter free / paid) + automatic fallback | DONE | 23 unit tests, mocked, no real API key required |
| Evidence-only fallback (never fabricates prose) | DONE | Used whenever every configured provider fails |
| Structured-output capability detection | DONE | Small verified allowlist; nothing assumed capable by default |
| Cost-control (timeout, cooldown, no-retry policy) | DONE | See docs/ARCHITECTURE.md's cost-control section |
| Real local (Ollama) inference | PLANNED | Never tested against a real local server |
| Real paid-tier OpenRouter call | PLANNED | Only the free tier has been exercised live, and only intermittently |

## Testing infrastructure (this session)

Vitest added (`vitest.config.ts`, `vitest.setup.ts`) — previously there was
no frontend or provider-level test runner, only the tsx-script convention
for the deterministic ML pipeline.

| Suite | Tests | Status |
|---|---|---|
| Provider architecture (`src/lib/providers/provider-architecture.test.ts`) | 23 | DONE — all passing |
| Frontend components (Header, MegaMenu, SearchOverlay, PlaceholderPage) | 23 | DONE — all passing |
| `npm run verify` (lint + typecheck + all tests + build) | — | DONE — single command, green |

## Known bug found and fixed this session

A live smoke test against real retrieval data surfaced a genuine grounding
defect (a fabricated-identifier query nearly passed as `supported_inference`
because a post-reranking score field was miscalibrated against a stale
assumption). Fixed and covered by a regression test using the real observed
score magnitudes. Full writeup in `docs/ML_ENGINE.md`.

## Resource constraints

OpenRouter (`openai/gpt-4o`) is the active LLM provider. The Vercel AI
Gateway remains blocked (`customer_verification_required`, unresolved across
every session so far). OpenRouter's free-tier balance is effectively
exhausted — every live `generateAnswer()` call this session failed with a
credit-insufficiency error from the provider. This blocks:

- Full golden-query generation-layer evaluation (7/20 tested, from a prior
  session)
- Live verification of the new reduced LLM answer schema
- Confidence calibration (needs more real generation runs)

None of these are code defects. No production behavior (token limits,
model choice, prompt content) was changed to work around the credit
constraint.

## Docker (this session)

`Dockerfile` (multi-stage, `next.config.ts`'s `output: "standalone"`) +
`docker-compose.yml` with two profiles, both using the same image:

| Path | Command | Status |
|---|---|---|
| OpenRouter | `docker compose --profile openrouter up --build` | DONE — image builds clean, container starts, homepage verified with `curl` (200) |
| Ollama (local) | `docker compose --profile local up --build` | PARTIAL — compose config written and reviewed; the `ollama` container itself and a real local-model round trip were not started/tested this session |

Neither path provisions a database — both need a real `DATABASE_URL`
(Neon or any pgvector-capable Postgres) via `.env.local`, which the compose
file passes through via `env_file`.

## Immediate next step

Get OpenRouter credit topped up (even a small amount) and re-run
`scripts/smoke-test-pipeline.ts` for the same 3 queries already
deterministic-verified this session — that closes the single largest
unverified gap (`generateAnswer()` in live production) with minimal spend.

## Intelligence Engine V1 — Phase 0-2 (this session, prompts/rag.md)

Full audit in `docs/INTELLIGENCE_ENGINE_AUDIT.md`, written before any code
changed. Key finding: the `relationships` table (the actual knowledge-graph
edges) has 0 rows — no extraction script has ever populated it — so any
graph *query* engine (`getNeighbors`, `findPath`, etc.) would return nothing
for every real call. Per the audit's own recommendation and this project's
established pattern of scoping specs down rather than attempting them
superficially, only the two phases that don't depend on graph data were
implemented this pass:

| Item | Status | Notes |
|---|---|---|
| Phase 0 — Repository audit | DONE | `docs/INTELLIGENCE_ENGINE_AUDIT.md` |
| Phase 1 — Query planner (`src/lib/query-planner.ts`) | DONE | Deterministic plan-type (14 types) + complexity (SIMPLE/MODERATE/COMPLEX) classification, no LLM call; 14 tests |
| Phase 2 — Domain tool registry (`src/lib/tools/`) | DONE | `resolveStandard`, `getStandard`, `searchStandards`, `findApplicableStandards`, `checkMandatoryStatus`, `findQCO`, `getCertificationScheme` — all deterministic, all return `{status: "not_found"}` rather than a guess; contract tests (registry timeout/validation/error handling) + a live smoke script (`npm run tools:smoke`) exercising every tool against the real DB |
| Phase 3 (graph relational layer) | Already DONE from the prior `dataAcquisition.md` milestone | Unchanged |
| Phase 4 (graph query engine) | Deliberately NOT attempted | Would query 0 relationship rows |
| Phases 5-15 (multi-channel retrieval orchestration, claim objects, agent orchestrator, workflow intelligence, caching, 100-query eval, observability, frontend) | NOT attempted this pass | See audit §4 gap table |

**Real bug found and fixed along the way**: `CERTIFICATION_KEYWORDS` in
`src/lib/coverage-analysis.ts` was `/\b(certif|licen[cs]e|scheme|mark|
registration)\b/i` — `\bcertif\b` requires a word boundary immediately
after "certif", which never occurs (the word always continues:
"certif**ication**", "certif**icate**"), so it silently never matched the
single most common way certification is actually written in evidence
text. This was live in the query pipeline's coverage analysis, not a new
bug — found while writing `query-planner.test.ts` against a realistic
certification sentence, not by design. Fixed to `/\b(certif\w*|
licen[cs]e\w*|scheme|mark|registration)\b/i` and covered by a new
regression test (`src/lib/coverage-analysis.test.ts`).

The new tools do not query `certification_schemes`/nothing in
`relationships` — `getCertificationScheme` deliberately reuses the
existing JSON-backed `findCertificationSchemeForStandard` (already the
UI's source of truth) rather than the DB table, since the audit found
`certification_schemes` has no direct standard foreign key (only an
indirect shared-`sourceId` link via `qcos`) — see audit §2 for the
duplicated-data risk this leaves unresolved.

Verification: `npm run verify` green (162 vitest tests + 4 ML test files,
lint clean, typecheck clean, production build clean); `npm run
eval:retrieval` unchanged at 12/12 recall, 8/8 no-false-match against the
dev server; `npm run tools:smoke` run live against the real Neon DB,
confirming both the positive paths (25 real standards, a real QCO, a real
certification scheme) and the anti-fabrication paths (unknown identifier →
`not_found`; a real standard with no QCO row → `hasVerifiedQco: false`,
never a false "voluntary" claim).

Neither the query planner nor the tool registry is wired into
`/api/v1/query` yet — that route's existing pipeline (intent → retrieval →
evidence → grounding → confidence → LLM) is untouched and still the one
actually serving requests.

### Phase 7-8 — bounded agent orchestrator (this session, follow-up)

`src/lib/agent/orchestrator.ts`: a single, bounded (max 3 iterations)
orchestrator that runs a plan's `retrievalTasks` in dependency-ordered
waves — identifier-independent tools first, identifier-dependent tools
(`getStandard`, `checkMandatoryStatus`, `findQCO`,
`getCertificationScheme`) once a candidate identifier is known — and
stops on `required_evidence_covered`, `no_useful_new_evidence`,
`max_iterations`, or `no_tools_for_plan`. Deliberately NOT LLM-driven:
tool selection comes entirely from the deterministic query planner, so
there's no LLM tool-choice to validate yet (rag.md §1/§22 still hold
trivially). Tasks the planner requests that have no registered tool
(`getStandardHistory`, `findLaboratories`, `compareStandards`,
`findRelatedStandards`, `findReferencedStandards`, `getBISService`,
`findTestingRequirements`) are reported as `skippedTasks`, never
fabricated. 8 tests (DB-free, via an injected fake tool executor) +
`npm run agent:smoke` run live against the real DB and tool registry.

**Real bug found and fixed via the live smoke script, not the unit
tests**: for a `CERTIFICATION`-type plan (whose `retrievalTasks` don't
include `resolveStandard`), a query that names a real identifier
explicitly — e.g. "What certification scheme applies to IS 269:2015?" —
was having that identifier silently overridden by an unrelated fuzzy
`findApplicableStandards` top hit, because nothing seeded the
already-parsed identifier before the tool calls ran. Fixed by seeding a
working identifier from the plan's own parsed identifiers up front, while
keeping `resolvedStandard` in the result strictly limited to identifiers
a confirming tool (one that actually validates against a real
table/dataset) approved — so a fabricated identifier the user typed is
still correctly reported as unresolved, never as "resolved."

Still not wired into `/api/v1/query`. Wiring the orchestrator into that
route (replacing or supplementing the existing intent→retrieval call) is
the natural next phase once a relationship-extraction script exists to
make Phase 4 (graph retrieval) worthwhile too.

### "Standard Reasoning" / cross-standard comparison (this session, follow-up)

User request (2026-08-30) asked for a "Truth Layer" that reasons across
standards for hybrid products and automatically flags upcoming mandatory
enforcement dates. Checked both against real data before writing any
code: **0 of the 21 migrated QCO rows have a real `effectiveDate` or
`notificationDate`** (all null), and the `relationships` table is still
at 0 rows. Automatic enforcement-date flagging and legal-precedence
reasoning would have nothing real to work from — building either now
would be a feature that either shows nothing or has the LLM assert an
unsupported legal conclusion, which CLAUDE.md's "never manufacture
certainty" and rag.md §9 both forbid. Declined to build those two
pieces; told the user why.

What IS real and was built: `compareStandardsTool`
(`src/lib/tools/comparison-tools.ts`, registered in the tool registry,
wired into the orchestrator's `COMPARISON` plan type). Reports only:
factual metadata differences (edition/status/domain/classification) from
the `standards` table, a genuine same-base-standard flag (reusing
`conflict-detection.ts`'s existing definition — not a new, drifting
copy), and real textual term-overlap between two standards' *actually
ingested* evidence chunks (reusing `coverage-analysis.ts`'s
`significantTerms`). Every result carries an explicit `limitations`
array stating it is not a legal-precedence ruling, and an
`evidenceAvailable` flag per standard — since only 4 of 25 standards
have ingested document text, most real comparisons will honestly report
"insufficient evidence to compare content," not fabricate one.
Live-verified via `npm run tools:smoke` against 4 real cases: two parts
of the same base standard (`sameBaseStandard: true`), two unrelated
standards with real overlap terms, one side missing evidence, and one
fabricated identifier (`not_found`). `npm run verify` green (170 vitest
tests), retrieval regression unchanged at 12/12 recall, 8/8
no-false-match.

### Dataset update: 22 → 48 entries (this session, follow-up)

User reported the upstream `BIS-Standards-AI-Assistant/BIS-standards-dataset`
repo now has 50 entries (up from 22). Cloned it, diffed by base standard
number: 26 are genuinely new (24 overlap with standards already in
`data/bis-standards-dataset/qco-standards.json`).

**Before merging, spot-checked upstream's own two previously-documented
errors** (see that file's README: the induction-cooker Section 26/6 mixup,
and the fabricated "IS 4151:2020" edition) — **both are still present,
unfixed, and still self-labeled `verified_accurate`** in the 50-entry
version. Worse, upstream's `IS 14543` entry again claims a "2024"
edition — the exact fabrication this project's README already documented
and corrected once before. This confirms upstream's self-verification
cannot be trusted for the new entries either.

Consequently, all 26 new entries were appended with
`verification_status: "needs_review"` (not upstream's `verified_accurate`
claim), each with a `verification_note` naming upstream's unverified
supersession/amendment/notification claims explicitly. Migrated into the
DB via the existing idempotent `npm run data:migrate-existing` — the 22
already-verified standards were untouched (correctly detected as
"already present"), 26 new `standards`/`qcos` rows were inserted, all
landed as `needs_review` in the DB (verified directly against the live
table, not assumed from the script's own claim).

**Real UI bug found and fixed along the way**: `SchemeExplorer.tsx`'s
verification badge rendered *any* non-null `verificationStatus` in the
same green "success" style, only special-casing `verified_accurate` →
"Verified" text — so a `needs_review` entry would have shown a green,
trust-implying badge literally reading `needs_review`. Fixed: a shared
label map (`src/lib/verification-status.ts`, deliberately without the
Node-only `fs`/`path` imports `certification-schemes.ts` has, so the
client-side `SchemeExplorer` doesn't pull server-only code into its
bundle) now renders `needs_review`/`unverified` with a distinct amber
"warning" style, never the green "verified" style. Applied to both
`SchemeExplorer.tsx` and the Standard Passport page
(`src/app/standards/[id]/page.tsx`), which had the same raw-value
fallback (a display-only rough edge, not a color-based misrepresentation
there, but fixed for consistency). New regression test confirms a
`needs_review` badge never carries the `success` class.

Two existing tests had a hardcoded dataset-size assumption (`toBe(22)`)
and an over-narrow standard-number regex that rejected the real joint
`IS/ISO 80601-2-56:2017` designation now in the dataset — both fixed.
`npm run verify` green (171 vitest tests), retrieval regression
unchanged at 12/12 recall, 8/8 no-false-match. `data:report` now shows
51 standards total (25 verified, 26 needs_review), 46/51 with a QCO,
still 4/51 with ingested document text, still 0 relationships.

### AI/ML completion audit + two same-day follow-up fixes (this session)

A full 38-section AI/ML status audit was written to
`docs/AI_ML_STATUS_REPORT.md` — independently verified against the live
DB and a full test-suite re-run, not trusted from prior docs. Result:
**42% weighted completion, NOT production-ready.** Top finding: the
query planner/tool registry/agent orchestrator built earlier this
session were real and tested but had zero production effect —
`/api/v1/query` never called them.

Two of that audit's own top recommendations were implemented
immediately after:

1. **`scripts/data-relationships.ts`** (new, idempotent) materializes
   the `relationships` table's first real rows — 50 total (4
   `STANDARD_HAS_PRODUCT_MANUAL`, 46 `STANDARD_SUBJECT_TO_QCO`, the
   latter a new relationship type) — from existing
   `documents.standardId`/`qcos.standardId` foreign keys, with real
   provenance and `verificationStatus` inherited from the underlying
   row (never upgraded). This is FK materialization, not text-based
   relationship extraction — explicitly documented as such in both the
   script and the audit update, so it isn't mistaken for more than it is.
2. **`src/app/api/v1/query/route.ts`** now calls the bounded agent
   orchestrator alongside (not instead of) the existing pipeline,
   contributing a new `toolEvidence` response field. Additive only —
   `engineConfidence`/`groundingState`/`recommendations` are computed
   by exactly the same code as before; a failure inside the orchestrator
   produces `toolEvidence: null`, never a failed request. Live-verified
   via 3 real HTTP calls against the running dev server, including the
   regression case from earlier this session (a CERTIFICATION-plan
   query naming `IS 269:2015` explicitly resolves to that standard, not
   an unrelated fuzzy search hit).

`npm run verify` green (200 vitest tests, up from 171 + this session's
orchestrator/knowledge-graph tests; 45/45 ML script tests), retrieval
regression unchanged at 12/12 recall, 8/8 no-false-match, production
build clean. `docs/AI_ML_STATUS_REPORT.md` updated in place with a
dated "UPDATE" section (not a rewrite) documenting exactly this,
recalculating overall completion to **~45%** — production readiness
verdict unchanged (**NOT READY**): the audit's stated top risks (26/51
standards unverified, 0 real temporal data, a 4-document corpus) are
untouched by either fix.

### Knowledge Boundary, Reference Registry, Graph Retrieval (this session, prompts/final.md)

Three new P0 modules, all real and live-verified: `src/lib/
knowledge-boundary.ts` (deterministic VERIFIED/PARTIALLY_SUPPORTED/
NOT_IN_DATABASE/CONFLICTING_EVIDENCE/UNVERIFIED_SOURCE classification
over signals the existing pipeline already computes), `src/lib/
reference-registry.ts` (real stored-field lookup — never an invented
URL/access type), and `src/lib/graph/graph-retrieval.ts` (`getNeighbors`
against the real `relationships` table). Two new tools registered
(`getReferenceEntry`, `getGraphNeighbors` — 10 tools total now), wired
additively into `/api/v1/query` as `knowledgeBoundary`, `referenceEntry`,
`graphNeighbors`.

**Real bug found via live testing and fixed**: the first wiring anchored
these to the retrieval engine's `topCandidate`, which for a standard
with no ingested document silently falls back to an unrelated ingested
standard — so a query about `IS 269:2015` (not indexed) was reporting
`IS 5522:2014`'s metadata instead. Fixed by preferring the orchestrator's
deterministically-resolved identifier, with an explicit override forcing
`NOT_IN_DATABASE` when the resolved standard isn't indexed and differs
from `topCandidate`. Verified before and after with the exact failing
query.

`npm run verify` green (211 vitest tests, up from 200; 45/45 ML tests),
`tools:smoke` and `agent:smoke` re-run live (10/10 tools verified,
including both new ones), retrieval regression unchanged (12/12, 8/8).
Full detail in `docs/AI_ML_STATUS_REPORT.md`'s "UPDATE 2" section,
including an honest scope cut: no ML reranker/model-registry/training
pipeline was built this pass (0 labeled pairs exist — building that
scaffolding now would be exactly the "looks sophisticated, adds
nothing real" outcome the prompt's own rules warn against).

### Footer policy pages served in-app (this session, follow-up)

The footer's Privacy Policy / Terms of Use / Accessibility Statement links
used to open www.bis.gov.in in a new tab, so three of the footer's own
destinations left the service entirely.

| Item | Status | Notes |
|---|---|---|
| `scripts/scrape-bis-policy-pages.ts` (`npm run data:policy-pages`) | DONE | Scrapes all three pages in English and Hindi from bis.gov.in; 19 unit tests over the parsers, run against BIS-shaped fixture HTML |
| `data/bis-policy-pages.json` | DONE | 6 variants scraped live on 2026-09-03: privacy (5 paragraphs, English only), terms (6 paragraphs, en + hi), accessibility (4 paragraphs, en + hi) |
| `/privacy-policy`, `/terms-and-conditions`, `/accessibility-statement` | DONE | Statically prerendered; footer now links internally |
| Provenance on every page | DONE | Source URL, retrieval date, and BIS's own "Last Updated" line (or an explicit "not stated on the BIS page") |
| Hindi | DONE | Shown when BIS publishes it. BIS serves an "only available in English" notice for the privacy policy under `?lang=hi`; that is recorded as `available: false` and the page falls back to English *and says so*, rather than machine-translating policy text or labelling English text as Hindi |

The text is reproduced word for word and is never summarised, reworded or
extended. A test pins the set of hosts BIS links to, so a future scrape
that starts pulling in unrelated hosts fails loudly.

A `/sitemap` page reproducing BIS's own sitemap was built and then removed
before merge: mirroring another site's navigation is not this service's
job, and every one of its ~111 links pointed off-site. The scraper's
link-group parsing went with it rather than being left as dead code.

Also fixed in passing: `politeFetch` (scripts/data-lib/rate-limit.ts) had
no request timeout, so a bis.gov.in connection that was accepted and then
never answered hung the whole script indefinitely — observed once during
this scrape. Each attempt now has a 45s deadline and is retried like any
other transport error.

`npm run verify` green: 0 lint errors, 294 vitest tests across 38 files (up
from 253 across 35), all three routes prerendered in the production build.
### Assistant workspace layout (this session, follow-up)

The results view was rebuilt as a three-column workspace from a supplied
NotebookLM-style design: official sources on the left, the assistant and
its results in the centre, output formats on the right. UI only — no new
backend.

| Item | Status | Notes |
|---|---|---|
| `src/components/workspace/SourcesPanel.tsx` | DONE | Official BIS sources + the existing Search Context panel, collapsible |
| `src/components/workspace/StudioPanel.tsx` | DONE | Output-format cards + real recent searches, collapsible |
| `HomeClient` three-column results view | DONE | Columns follow which panels are open; both side panels hide below their breakpoint |
| Shared recent-query store bindings | DONE | `subscribeToRecentQueries` / `getRecentQueriesSnapshot` extracted from `RecentQueries.tsx` into `src/lib/recent-queries.ts` so both surfaces share one implementation |
| Truthfulness of the supplied design | ADAPTED | See below — 11 panel tests pin these |

Three things in the design could not be reproduced literally without
breaking the project's own rules, so they were adapted rather than copied:

1. **Source counts.** The design shows "1,245 standards", "467 orders",
   "18,765 notifications". This app does not hold those figures, and a
   plausible number beside a government source is exactly the fabrication
   CLAUDE.md forbids. Each row shows its real host instead — checkable,
   where a total would not be. A test asserts no count-shaped subtitle.
2. **"Recent notebooks."** The design lists notebooks that do not exist.
   Replaced with this browser's real query history, which the app already
   keeps; empty history says so rather than showing placeholder rows.
3. **Studio formats.** Video Overview, Mind Map, Reports, Flashcards, Quiz,
   Infographic and Data Table are not built. They render disabled and
   labelled "Planned", with a line saying they are not built yet — the same
   honest-placeholder rule the section pages already follow.

**Left panel vs "no permanent left sidebar."** CLAUDE.md rules out a
dashboard sidebar. This panel is a working surface beside the results, not
navigation: the full-width government top navigation is untouched and
remains the only way around the app, the panel collapses, and it is hidden
entirely below `lg`. Flagged rather than assumed — say if it should go.

Source selection is presentational: the checkboxes toggle but do not
re-scope retrieval, and the panel says so where a user will see it.
The duplicated "Official BIS Portal" card was dropped from the results
column; e-BIS is now a row in the sources list.

`npm run verify` green: 0 lint errors, 264 vitest tests across 36 files (up
from 253 across 35).

### Sources panel: reader-supplied documents, shared with the assistant (this session, follow-up)

The Sources panel was rebuilt from a supplied design into a working source
library. A reader adds a PDF or text file; it is analysed; the Indian
Standards it cites become part of what the assistant discusses.

| Item | Status | Notes |
|---|---|---|
| `src/lib/source-library.ts` | DONE | Shared store + `useSyncExternalStore` bindings; 13 unit tests |
| `SourcesPanel` upload / drag-drop / remove / select | DONE | Posts to the pre-existing `/api/v1/analyze-document`; 27 panel tests |
| Source search bar | DONE | Filters added sources by filename and by the standards they cite; its only control is the document input |
| Shared knowledge base with the assistant | DONE | `HomeClient` unions result standards with library standards into `BisChatBot`'s `standardNumbers` |
| Scope made visible | DONE | Chat header and centre column both say how much context came from added sources |
| Web discovery ("Web" / "Fast Research") | REMOVED | Drawn from the design at first, then removed on request — there is no web-search service, so no control claims one |

**No new backend was needed.** `/api/v1/analyze-document` already existed,
fully built and unit-tested, with no UI calling it — it parses PDF/text,
extracts BIS identifiers deterministically, and never sends the file to a
model. This panel is its front end.

**What is shared is identifiers, never document text.** The standards a
document cites travel to the chat exactly like those from a search, and the
server resolves the facts from the database. Posting the document's prose as
chat input would re-open what `src/lib/chat-context.ts` closed and would let
an uploaded file's wording act on the assistant. The panel therefore does
not claim the assistant can answer "what does paragraph 3 of my file say" —
a test asserts the wording stays honest about this.

Cited-but-unindexed standards are shown dimmed and excluded from what is
shared: the document really does cite them, but the assistant has nothing to
answer from, and the two cases must not look identical.

**Verified live**: uploading a text file citing IS 15450:2004 and
IS 4985:2021 returns both identifiers with `inDatabase: false` and an
explicit limitation string. Which is the honest catch — **the `standards`
table is still empty in this environment (0 rows), so nothing an uploaded
document cites currently resolves, and the shared scope stays empty.** The
panel reports this accurately rather than appearing broken; it starts
contributing context as soon as ingest populates `standards`.

Files are held in `sessionStorage` for the tab only, and are sent nowhere
except to be read for the standards they cite.

`npm run verify` green: 0 lint errors, 285 vitest tests across 37 files (up
from 253 across 35).
