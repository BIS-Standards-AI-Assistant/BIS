# BIS Standards Navigator

> **Smart India Hackathon 2026 — Problem Statement SIH26107**
> *AI-Powered Intelligent Assistant for Indian Standards & BIS Services*
> Ministry of Consumer Affairs, Food & Public Distribution

An **evidence-first standards intelligence system** for discovering Indian Standards (IS)
and related BIS certification and testing information. It answers natural-language questions
and is built to **never fabricate** a standard number, title, clause, certification route, or
requirement it cannot trace back to a real indexed source.

```
"I manufacture stainless steel water bottles — which Indian Standard applies?"
        │
        ▼
   candidate standards  →  why each is relevant  →  source evidence (document, page, clause)
        →  testing / certification information  →  what to do next
```

If retrieval is weak or the query falls outside the indexed corpus, the system says so
explicitly instead of guessing.

**Tech stack:** `Next.js 16` · `TypeScript` · `PostgreSQL + pgvector` (Neon) · `Drizzle ORM` ·
`Vercel AI SDK` (provider-agnostic) · `Tailwind CSS v4` · `Vitest` + `Playwright`

---

## Table of contents

- [What this project does](#what-this-project-does)
- [Architecture flow](#architecture-flow)
- [Tech stack](#tech-stack)
- [What's working vs. in progress](#whats-working-vs-in-progress)
- [Local setup](#local-setup)
- [Choosing an LLM provider path](#choosing-an-llm-provider-path)
- [Running with Docker](#running-with-docker)
- [Repository layout](#repository-layout)
- [Scripts](#scripts)
- [Testing & verification](#testing--verification)
- [Data & truth rules](#data--truth-rules)
- [Documentation index](#documentation-index)
- [Built for SIH26107](#built-for-sih26107)

---

## What this project does

BIS publishes a large, continuously evolving body of Indian Standards covering products,
materials, processes, testing, safety and compliance. For an MSME, a startup, a student or a
consumer the problem is rarely the *absence* of information — it is finding the **right**
information, knowing whether it actually applies, and being able to **verify the evidence**.

BIS Standards Navigator treats that as a structured retrieval-and-evidence problem:

| Capability | What the user gets |
|---|---|
| **Natural-language standards search** | Ask in plain English or Hindi; get candidate Indian Standards, not a link dump. |
| **Relevance explanation** | For every candidate, *why* it was surfaced — matched product / material / use-case / testing / certification signals. |
| **Source evidence** | The actual document, page and clause each claim came from, inspectable inline. |
| **Certification & testing context** | QCO / mandatory-vs-voluntary status and testing signals, cross-referenced against a fact-checked reference dataset. |
| **Honest refusal** | Out-of-corpus or low-confidence queries return a fixed response naming the corpus boundary — never a hedged guess. |
| **Document workspace** | A reader can add a PDF/text file; the Indian Standards it cites become part of what the assistant discusses (identifiers only — the file text is never sent to a model). |
| **On-screen latency** | End-to-end response time is shown, for the demo and for the user. |

The product is deliberately styled as a **credible official public service** — full-width
government-style top navigation, BIS identity primary, no dashboard sidebar, no AI-chatbot
aesthetics.

### The core design invariant

A deterministic pipeline — query normalization, identifier resolution, hybrid retrieval, ML
reranking, evidence aggregation, coverage analysis, conflict detection, grounding, confidence
scoring — runs to completion **before an LLM is ever called**. The LLM's only job is turning
already-verified evidence into readable prose. Its response schema has **no field** for the
grounding state, the confidence score, or citation identity, so it *physically cannot*
override them.

**Paid LLM inference is optional and is not a dependency.** With zero LLM provider configured
(`LLM_PROVIDER=none`), every query falls back to deterministic intent extraction and an
evidence-only answer — the app still works, just without AI-written prose.

---

## Architecture flow

The pipeline the PRD specifies, as implemented:

```text
                        User Query (text, EN / HI)
                                  │
                     Language detection / normalization
                                  │
                     Standards identifier resolution
                (exact "IS 14543:2016" → deterministic fast path, no LLM)
                                  │
                   Intent / constraint extraction
             (LLM when a capable provider is configured;
              deterministic keyword fallback otherwise)
                                  │
                        Hybrid retrieval
           (pgvector semantic  +  Postgres full-text  →  RRF fusion)
                                  │
                        ML reranking
              (document-diversity, competitiveness-gated)
                                  │
                      Evidence aggregation
                (per-standard, chunk-volume-bias resistant)
                                  │
                      Coverage analysis
        (product / material / use-case / testing / certification / identifier)
                                  │
                Conflict / version analysis
        (edition, superseded, mandatory-vs-voluntary)
                                  │
                  Deterministic grounding
        verified  /  supported_inference  /  insufficient_evidence
                                  │
              ┌───────────── below threshold ──────────────┐
              │                                            ▼
       Deterministic engine confidence          Fixed "not found in corpus"
              │                                  refusal (names the boundary)
              ▼
     LLM answer synthesis (grounded strictly in retrieved evidence)
        — or deterministic evidence-only answer if no provider —
                                  │
             Standard-number + citation validation
              (no citation → treated as a failed generation)
                                  │
                        Grounded BIS answer
                (answer + citations + source links + latency)
```

**LLM provider fallback** (`LLM_PROVIDER=auto`): `local (Ollama)` → `OpenRouter free tier` →
`paid provider` → **evidence-only**. Retry limit is 0 per provider — a failure moves to the
next, never retries. A failing provider is put in a 60-second cooldown.

Rendered Mermaid versions of all five architecture diagrams (system context, component
architecture, pipeline, provider fallback, data model, deployment) are in
[`docs/HLD.md`](docs/HLD.md).

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | One deployable — UI + API routes in a single process. `output: "standalone"` for a minimal Docker image. |
| **Language** | TypeScript (strict) | `tsc --noEmit` is part of `npm run verify`. |
| **Database** | PostgreSQL + `pgvector` | Developed on [Neon](https://neon.tech); any pgvector-capable Postgres works. |
| **ORM / migrations** | Drizzle ORM + drizzle-kit | Schema in [`src/db/schema.ts`](src/db/schema.ts). |
| **Retrieval** | pgvector (HNSW, 1536-dim) + Postgres FTS + Reciprocal Rank Fusion | Degrades to keyword-only if embedding fails. |
| **Reranking** | In-repo document-diversity reranker | Deterministic, no model server. |
| **LLM access** | Vercel AI SDK behind a custom provider adapter (`src/lib/providers/`) | No direct dependency on any one provider. Local / OpenRouter / paid / none. |
| **Embeddings** | OpenAI-compatible embedding endpoint (configurable) | Separate concern from the LLM chain. |
| **Speech-to-text** | Browser Web Speech API, with an optional server fallback (`/api/v1/transcribe`) | Any OpenAI-compatible `/audio/transcriptions` endpoint (Groq recommended). Optional. |
| **Styling** | Tailwind CSS v4 | Government design system; dark-mode aware. |
| **Unit / component tests** | Vitest + React Testing Library + jsdom | ~350 tests across ~40 files. |
| **Deterministic pipeline tests** | Plain `tsx` scripts | No DB, no LLM, no network. |
| **E2E / a11y / visual** | Playwright + `@axe-core/playwright` | Accessibility, responsive and visual suites. |
| **Maps** | Leaflet / react-leaflet | Testing-laboratory locator. |
| **Container** | Multi-stage Dockerfile + docker-compose (two profiles) | OpenRouter path and fully-local Ollama path. |

---

## What's working vs. in progress

Status is tracked in detail — and honestly — in
[`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) and
[`docs/AI_ML_STATUS_REPORT.md`](docs/AI_ML_STATUS_REPORT.md). Summary:

### ✅ Working (implemented, tested, and — where noted — live-verified)

| Area | Status |
|---|---|
| Query normalization, identifier resolution | DONE — deterministic, unit-tested |
| Hybrid retrieval (pgvector + FTS + RRF), ML reranking | DONE — 12/12 recall, 8/8 no-false-match on the retrieval regression set |
| Evidence aggregation, coverage analysis, conflict/version detection | DONE — unit-tested against real query numbers |
| Deterministic grounding + engine confidence | DONE — grounding bug found & fixed via live smoke test; guaranteed consistent with grounding state |
| Provider-independent LLM adapter (local / OpenRouter / paid) + automatic fallback | DONE — 23 unit tests (mocked); no API key required to pass |
| Evidence-only answer path (never fabricates prose) | DONE — first-class tested response path, not a bolt-on |
| Deterministic intent fast path (exact-ID queries skip the LLM) | DONE |
| Citation / standard-number validation & abstention | DONE — validated against fabricated & unknown identifiers |
| Multilingual (Hindi) query + answer, on-screen latency, answered-vs-refused logging | DONE — live-verified for multilingual parity on 2026-09-04 |
| Fixed, explicit refusal naming the corpus boundary | DONE — wired to the deterministic grounding decision |
| Government-style navigation, homepage, Standards browse/compare, Standard Passport | DONE — verified visually |
| Certification discovery + scheme explorer; testing-laboratory locator | DONE |
| Document workspace (upload → extract cited IS identifiers → shared assistant scope) | DONE — identifiers only, file text never sent to a model |
| In-app policy pages (Privacy / Terms / Accessibility, EN + HI, word-for-word from BIS) | DONE |
| `npm run verify` (lint + typecheck + all tests + production build) | DONE — single green command |

### 🟡 In progress / partial

| Area | Status | Blocker |
|---|---|---|
| Live LLM answer synthesis (`generateAnswer()` end-to-end) | PARTIAL | Schema round-trip verified with mocked responses; free-tier OpenRouter credit exhaustion has blocked a sustained live generation run. Not a code defect. |
| Confidence calibration curve | BLOCKED | Honestly reports "insufficient data" (needs 20+ real generation samples) rather than fabricating a curve. |
| Top-1 relevance floor (PRD §8.1) | PLANNED | A live smoke test confirmed grounding can currently be too lenient on nonsense queries when semantic search falls back to keyword-only. Highest-priority follow-up. |
| Corpus size | PARTIAL | ~19 seed documents ingested; ~51 standards in the reference dataset (25 fact-checked `verified`, 26 `needs_review`). Corpus expansion (scheme PDFs, FAQs, circulars) is a separate data-engineering track. |
| Knowledge-graph relationship extraction | PARTIAL | 50 relationship rows *materialized from existing foreign keys*; text-based relationship extraction not yet built. |
| Query planner / tool registry / agent orchestrator | PARTIAL | Built, tested (10 tools, DB-smoke-verified), and wired additively into `/api/v1/query` as a supplementary `toolEvidence` field — does not yet replace the core pipeline. |
| Real local (Ollama) + real paid-tier inference | PLANNED | Only the OpenRouter free tier has been exercised live. |
| Dedicated responsive / a11y / dark-mode audit passes | PLANNED | Playwright suites exist; a full screenshot-verified audit at every breakpoint has not been run. |

**Overall AI/ML completion: ~45%. Not production-ready** — see
[`docs/AI_ML_STATUS_REPORT.md §36`](docs/AI_ML_STATUS_REPORT.md). The gaps above are tracked,
not hidden.

---

## Local setup

### 1. Prerequisites

- **Node.js 20+**
- A **PostgreSQL database with the `pgvector` extension**. This project is developed against
  [Neon](https://neon.tech) (free tier is enough); any pgvector-capable Postgres works.
- *(optional)* An LLM provider — see [the next section](#choosing-an-llm-provider-path). The
  app runs without one.

### 2. Install and configure

```bash
git clone <this-repo>
cd BIS
npm install

cp .env.example .env.local
# Fill in DATABASE_URL at minimum. Every other variable is optional —
# .env.example documents each one inline.
```

### 3. Create the schema

```bash
npm run db:push        # drizzle-kit push — creates documents, chunks, query_logs, and the
                       # knowledge-graph tables against DATABASE_URL
```

### 4. Ingest the seed corpus

```bash
npm run ingest         # reads data/seed/manifest.json → chunks → embeds → writes to Postgres
```

The seed set is ~19 real BIS documents (product manuals, scheme material) listed with full
provenance in [`data/seed/manifest.json`](data/seed/manifest.json).

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Verify your setup

```bash
npm run eval:retrieval   # retrieval regression against your DB (no LLM): expect 12/12 recall
npm run verify           # full gate: lint + typecheck + all tests + production build
```

> **Windows note:** the production build's parallel page-data collection phase can OOM on
> memory-constrained machines. `next build --experimental-build-mode=compile` completes if
> you hit this — it is a local resource limit, not a code error.

---

## Choosing an LLM provider path

The app works with **no LLM provider at all** (`LLM_PROVIDER=none`, or leaving every
provider's env vars empty): intent extraction and answer generation fall back to deterministic
behavior. For AI-generated prose, pick one of:

| Path | Setup | Cost |
|---|---|---|
| **Local (Ollama / any OpenAI-compatible server)** | Run the server, pull a model, set `LOCAL_LLM_BASE_URL` + `LOCAL_LLM_MODEL` | Free, fully offline |
| **OpenRouter (free tier)** | Set `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` | Free tier available |
| **Paid** | Set `PAID_PROVIDER_API_KEY` + `PAID_PROVIDER_MODEL` (any OpenRouter-compatible endpoint) | Pay-as-you-go — **never required** |

`LLM_PROVIDER=auto` (the default) tries them in order: `local → openrouter-free → paid →
evidence-only`. Structured extraction (intent) requires a model on the verified
structured-output allowlist in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); models not on
it are still used for plain-text tasks (e.g. translation) and the pipeline stays on the
deterministic path for the rest.

---

## Running with Docker

Two ready-to-run profiles, same image — see [`docker-compose.yml`](docker-compose.yml):

```bash
# OpenRouter path (needs OPENROUTER_API_KEY in .env.local)
docker compose --profile openrouter up --build

# Fully local path — no API key
docker compose --profile local up --build
docker compose --profile local exec ollama ollama pull llama3
```

Neither profile provisions a database — both read `DATABASE_URL` from `.env.local` via
`env_file`, so point it at your own Postgres/pgvector instance first. Both build from the same
multi-stage `Dockerfile`; `output: "standalone"` keeps the final image to just the server
bundle.

---

## Repository layout

```
src/
  app/                     Next.js App Router — pages + API routes
    page.tsx               Homepage (service proposition + natural-language search)
    standards/[id]/        Standard Passport (identity, evidence, certification, testing)
    certification/         Certification discovery + scheme explorer
    testing/               Testing info + laboratory locator (Leaflet)
    search/                Keyword document search
    api/v1/
      query/route.ts       Main pipeline orchestration
      search/route.ts      Hybrid retrieval endpoint
      chat/route.ts        Scoped follow-up conversation
      analyze-document/    PDF/text → cited IS identifiers (no model call)
      health/route.ts      Liveness + dependency check
  components/              UI — Header/MegaMenu, SearchOverlay, evidence panels, workspace
  lib/
    query-normalization.ts standards-id.ts       Deterministic front of the pipeline
    retrieval.ts           ml/reranker.ts         Hybrid retrieval + reranking
    evidence-aggregation.ts coverage-analysis.ts conflict-detection.ts
    grounding.ts           confidence.ts          Deterministic grounding + confidence
    knowledge-boundary.ts  refusal.ts             Boundary classification + fixed refusals
    intent.ts  answer.ts                          The only two LLM-touching modules
    providers/             Provider adapter + router (local / OpenRouter / paid)
    tools/  agent/  graph/                        Query planner, tool registry, orchestrator
    language.ts  translate.ts                     Multilingual (script-range detection)
  db/
    schema.ts              Drizzle schema — documents, chunks, query_logs, KG tables
data/
  seed/                    ~19 real BIS documents + manifest with provenance
  bis-standards-dataset/   Fact-checked QCO / standards reference set (+ fact-check notes)
  evaluation/              Golden-query sets and committed eval artifacts
scripts/                   Ingestion, deterministic test suites, evals, data-engineering
docs/                      HLD, architecture, ML engine, evaluation, project status, UI spec
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (frontend + API routes, one process) |
| `npm run build` / `npm run start` | Production build / start |
| `npm run verify` | **The one command before any PR** — lint, typecheck, all tests, production build |
| `npm run test` | All tests (`test:ml` + `test:unit`) |
| `npm run test:ml` | Deterministic pipeline tests (normalization, aggregation, grounding, schema) — no DB, no LLM, no network |
| `npm run test:unit` | Vitest — provider architecture + frontend components + lib modules |
| `npm run test:e2e` / `test:a11y` / `test:responsive` / `test:visual` | Playwright suites |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:push` / `db:studio` | Apply schema / open Drizzle Studio |
| `npm run ingest` | Ingest `data/seed/` into the database |
| `npm run eval:retrieval` / `eval:reranker` | Retrieval / reranker regression against the live DB (no LLM) |
| `npm run eval:generation` / `eval:validate` | Full generation-layer golden-query eval (needs a working LLM provider, burns credit) |
| `npm run eval:calibration` | Confidence calibration report (reports "insufficient data" honestly) |
| `npm run smoke:prd` | Live end-to-end smoke against the real DB + provider for the PRD demo cases |
| `npm run links:check` | Verify every official BIS link the app renders still resolves |
| `npm run data:*` | Data-engineering pipeline (discovery, fetch, parse, migrate, report, relationships) |

---

## Testing & verification

- **Deterministic pipeline** — `npm run test:ml`. Runs with no database, no LLM, and no
  network. Proves the grounding / confidence / citation logic offline.
- **Provider architecture** — 23 Vitest cases, fully mocked; no real API key needed. Proves
  the fallback contract (`local → free → paid → evidence-only`, 0 retries, cooldowns).
- **Frontend & lib** — React Testing Library component tests + module unit tests (~350 total).
- **Retrieval regression** — `npm run eval:retrieval` against a live DB: 12/12 recall, 8/8
  no-false-match on a curated in/out-of-corpus set.
- **Live smoke** — `npm run smoke:prd` exercises the PRD's exact demo script (English query,
  nonsense refusal, real-but-unindexed identifier, Hindi parity) against the real stack.
- **E2E / a11y / visual** — Playwright + axe-core.

Every meaningful change is expected to pass `npm run verify` (lint + typecheck + all tests +
production build) before merge.

---

## Data & truth rules

These are enforced conventions, not aspirations:

- **No invented BIS content.** No fabricated standards, titles, clauses, certification routes,
  testing requirements, announcements, statistics, or confidence scores. Where the original
  UI design called for plausible-looking numbers ("1,245 standards"), the app shows the real
  host instead — checkable, where a total would not be.
- **Every substantive claim has an evidence path:** claim → why relevant → evidence → source
  document → page / section / clause where available.
- **Insufficient evidence is stated, not papered over.** The refusal copy is fixed and names
  the corpus boundary; it is never a soft "I'm not sure, but…".
- **The reference dataset carries verification status.** 25 fact-checked entries are
  `verified`; 26 imported from upstream are `needs_review` with a note on exactly which
  upstream claims are unconfirmed — and the UI renders that badge in a distinct amber style,
  never the green "verified" style.
- **Corpus boundary is visible in-product**, per the PRD: public titles / scopes, scheme
  docs and FAQs — not full standard text (which BIS sells commercially).

See [`docs/ui/`](docs/ui/) for the full data/truth specification and
[`data/bis-standards-dataset/README.md`](data/bis-standards-dataset/README.md) for dataset
provenance.

---

## Documentation index

| Doc | Covers |
|---|---|
| [`docs/HLD.md`](docs/HLD.md) | High-level architecture — system context, component architecture, pipeline, provider fallback, data model, deployment (Mermaid diagrams) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | The LLM provider adapter — routing, fallback, capability detection, cost control |
| [`docs/ML_ENGINE.md`](docs/ML_ENGINE.md) | The deterministic intelligence pipeline — what's implemented, what's tested, bugs found & fixed |
| [`docs/EVALUATION.md`](docs/EVALUATION.md) | Test / eval results — deterministic suites, retrieval regression, live smoke tests |
| [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) | Top-level DONE / PARTIAL / BLOCKED / PLANNED across the whole app |
| [`docs/AI_ML_STATUS_REPORT.md`](docs/AI_ML_STATUS_REPORT.md) | Independent AI/ML completion audit (~45%, not production-ready) |
| [`docs/PRD_GAP_ANALYSIS.md`](docs/PRD_GAP_ANALYSIS.md) | The external PRD, requirement by requirement, against the code |
| [`docs/ui/SIH.md`](docs/ui/SIH.md) | Canonical problem statement + pipeline specification |
| [`docs/ui/`](docs/ui/) | Full UI spec — design system, IA, component spec, data/truth rules, accessibility |
| [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) | Instructions for AI coding agents working in this repo |

---

## Built for SIH26107

This project was built for **Smart India Hackathon 2026**, problem statement **SIH26107 —
"AI-Powered Intelligent Assistant for Indian Standards & BIS Services"**, proposed by the
**Ministry of Consumer Affairs, Food & Public Distribution**.

The [PRD](docs/PRD_GAP_ANALYSIS.md) targets the hackathon demo script directly: an MSME
struggling across scattered PDFs, a real product-certification question answered with a live
cited standard and clause, a deliberately out-of-corpus question met with an honest refusal,
and a multilingual query with the response-time metric visible on screen.

The corpus is a **pilot-scope, genuinely-public subset** — BIS standard titles and scope
summaries, public certification scheme material, and public FAQs. Full verbatim standard text
(sold commercially by BIS) is intentionally out of scope, and that boundary is stated in the
product itself.
