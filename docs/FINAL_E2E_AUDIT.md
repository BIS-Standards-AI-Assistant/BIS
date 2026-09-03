# Final E2E Feature Audit

2026-09-03, Phase 0 of prompts/pfinal.md, written before any implementation
in this pass. Builds directly on `docs/P1_IMPLEMENTATION_AUDIT.md` and the
P0 audit fork's findings earlier this session — re-verified against
current code, not copied blind.

| Feature | UI | API | Engine | Data | Evidence | Integration | Tests | Live |
|---|---|---|---|---|---|---|---|---|
| Knowledge Boundary | Partial (badge/labels exist, not a platform-wide gate) | Yes (`knowledgeBoundary` on `/api/v1/query`) | Yes (`classifyKnowledgeBoundary`) | Real | Real | Only `/query`; not enforced on chat/cert/search | Yes | Partial — verified for `/query`, not chat |
| Research Assistant | Yes (`BisChatBot`) | Yes (`/api/v1/chat`, built P0) | Yes (`chat-context.ts`) | Real | Real | Scoped context + explicit global expansion, live-verified P0 | Yes (13 tests) | **Yes** — full scenario B sequence live-tested P0 |
| Regulatory Intelligence | Partial (certification/testing notes only) | Partial (`certification`/`testing` fields) | Partial (`checkMandatoryStatus`, `getCertificationScheme` tools) | Real but thin (no gazette/regulation entities) | Real (QCO rows) | Not a dedicated layer — reuses P0 tool wiring | Partial | Partial — mandatory-status query works, no timeline |
| Evidence Backend | Partial (`EvidenceExcerpt` component) | Partial (evidence embedded in `/query`/`/chat`, no standalone evidence-search endpoint) | No dedicated evidence-search engine | Real (chunks table) | Real | Evidence is a field on other responses, not first-class/addressable by ID | No dedicated tests | Not independently live-verified |
| Laboratory Finder | **No** | **No** | **No** | **No table exists** | N/A | N/A | N/A | N/A |
| Map Locator | **No** | **No** | **No** | N/A — no provider configured | N/A | N/A | N/A | N/A |
| Version Intelligence | No | No | No | **No amendment/supersession evidence in corpus** (confirmed P1 audit) | N/A | N/A | N/A | N/A |
| Document & Product Analyzer | **No upload UI** | **No upload route exists** | No | No | No | No | No | No |
| Certification Assistant | Partial (`InfoCard` shows notes) | Yes, reuses `/query`'s `certification` field | Yes (`getCertificationScheme` tool, P0) | Real (4 certification schemes) | Real | Not a dedicated guided flow — a field on the general query response | Yes (certification-tools.test.ts) | **Yes** — live-verified P0 (helmet query) |
| Testing Requirements | Partial (`InfoCard`) | Yes, reuses `/query`'s `testing` field | Partial (same `getCertificationScheme.testingParameters`, not a dedicated testing-method model) | Real but thin (4 short strings per scheme, no clause/method/equipment fields) | Real | Same as Certification — not dedicated | Partial | **Yes** — live-verified P0 (helmet query) |

## What this confirms, re-checked live this pass

- No `laboratories` table, no map/geocoding environment variable, no
  upload API route exist anywhere in the codebase (`grep` across
  `src/db/schema.ts`, `.env.local`, `src/app/api/`) — confirmed again
  just now, not assumed from memory.
- Research Assistant and Certification/Testing reachability are the only
  two of the nine features with a genuine, live-verified, end-to-end
  production path (UI → API → engine → DB → evidence → response) —
  both built in P0 this session.
- Knowledge Boundary is real but scoped to `/api/v1/query` only; it is
  not yet enforced on `/api/v1/chat`'s scoped answers or on the
  certification-schemes endpoint.
- Evidence is real data but not a first-class, independently addressable
  capability (§5 of pfinal.md) — it's currently a field embedded in other
  responses, with no `evidenceId`-keyed lookup or evidence-search query
  path.

## Two features this audit cannot responsibly implement without a decision from the user

1. **Laboratory Finder + Map API Locator (§6)**: requires (a) a chosen
   map/geocoding provider (Google Maps Platform is the example given,
   but it is not free — it needs a billing-enabled API key), and (b) a
   real laboratory dataset (name/address/lat-lon/accreditation/tested
   capability) from an authoritative source, which does not exist in
   this repository or its ingested corpus. Building the `MapProvider`
   abstraction without a live key to test against would produce
   untestable code; fabricating laboratory records is explicitly
   forbidden by this same prompt (§6, §24) and by every prior prompt in
   this session.
2. **Document & Product Analyzer — the upload half (§8.1-8.2)**: a new
   file-upload endpoint is new, real attack surface (§8.5 lists prompt
   injection, malformed PDFs, oversized files) that this project's
   existing architecture has never had. Building it is very doable
   (`pdf-parse` is already a dependency, used this session for the data
   acquisition batch), but it's a scope/security decision, not a purely
   technical one — worth confirming before adding a public write-ish
   endpoint that accepts arbitrary files.

Everything else in pfinal.md (Knowledge Boundary platform-wide
enforcement, a first-class Evidence Backend/search endpoint, Version
Intelligence, Regulatory Intelligence's timeline, Product Analyzer as a
*text-input* flow — i.e. §8.3's "product description" case, which needs
no file upload at all) is implementable against what already exists,
and is what this pass proceeds with.
