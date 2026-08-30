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
