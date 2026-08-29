# BIS Standards Navigator

**Smart India Hackathon 2026 — SIH26107**
An evidence-first standards intelligence system for discovering Indian Standards (BIS) and related certification/testing information — built to never fabricate a standard, clause, or requirement it can't cite.

See [`docs/ui/SIH.md`](docs/ui/SIH.md) for the full problem statement and pipeline specification, and [`docs/HLD.md`](docs/HLD.md) for the architecture diagrams referenced throughout this README.

## What this is

A natural-language question ("I manufacture stainless steel water bottles — which standard applies?") goes through a deterministic pipeline — query normalization, identifier resolution, hybrid retrieval, ML reranking, evidence aggregation, coverage analysis, conflict detection, grounding, and confidence scoring — **before** an LLM ever sees it. The LLM's only job is turning already-verified evidence into readable prose; it cannot invent a standard, a citation, a grounding state, or a confidence score. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/ML_ENGINE.md`](docs/ML_ENGINE.md) for the full design and what's actually been verified.

**Paid LLM inference is optional and is not a dependency of this system.** With zero LLM provider configured, the app still returns evidence-backed answers — just without AI-written prose.

## Quick start

### 1. Prerequisites

- Node.js 20+
- A Postgres database with the `pgvector` extension (this project uses [Neon](https://neon.tech); any pgvector-capable Postgres works)

### 2. Install and configure

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL at minimum — everything else is optional, see below
```

### 3. Ingest the seed corpus

```bash
npm run ingest
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Choosing an LLM provider path

The app works with **no LLM provider configured at all** — `LLM_PROVIDER=none` (or leaving every provider's env vars empty) makes every query fall back to deterministic intent extraction and an evidence-only answer. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full provider-independence design.

If you do want AI-generated prose, pick one of two paths (or set `LLM_PROVIDER=auto` to try both, local first):

| Path | Setup | Cost |
|---|---|---|
| **Local (Ollama)** | Run Ollama, pull a model, set `LOCAL_LLM_BASE_URL` + `LOCAL_LLM_MODEL` | Free, fully offline |
| **OpenRouter (free tier)** | Set `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` | Free tier available |

A `PAID_PROVIDER_*` path also exists for a paid OpenRouter-compatible key/model, but nothing in this app requires it.

## Running with Docker

Two ready-to-run profiles, same image — see [`docker-compose.yml`](docker-compose.yml):

```bash
# OpenRouter path (needs OPENROUTER_API_KEY in .env.local)
docker compose --profile openrouter up --build

# Ollama path — fully local, no API key
docker compose --profile local up --build
docker compose --profile local exec ollama ollama pull llama3
```

Neither profile provisions a database — both read `DATABASE_URL` from `.env.local` via `env_file`, so point it at your own Postgres/pgvector instance first.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (frontend + API routes — one process) |
| `npm run build` / `npm run start` | Production build / start |
| `npm run verify` | **The one command to run before any PR** — lint, typecheck, all tests (ML pipeline + provider architecture + frontend components), and build |
| `npm run test` | All tests (`test:ml` + `test:unit`) |
| `npm run test:ml` | The 45 deterministic pipeline tests (query normalization, evidence aggregation, grounding, coverage, conflicts, schema validation) — no DB, no LLM, no network |
| `npm run test:unit` | Vitest — provider architecture (23 tests, mocked) + frontend components (23 tests) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run ingest` | Ingest `data/seed/` into the database |
| `npm run eval:retrieval` / `eval:reranker` | Retrieval/reranker regression against the live DB (no LLM) |
| `npm run eval:generation` / `eval:validate` | Full generation-layer golden-query evaluation (needs a working LLM provider and burns real credit) |
| `npm run eval:calibration` | Confidence calibration report — honestly reports "insufficient data" rather than fabricating a curve |

## Project status

[`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) is the single source of truth for what's DONE / PARTIAL / BLOCKED / PLANNED across the whole app — read it before assuming something works. [`docs/EVALUATION.md`](docs/EVALUATION.md) has the actual test/eval numbers behind those claims.

## Documentation index

| Doc | Covers |
|---|---|
| [`docs/HLD.md`](docs/HLD.md) | High-level architecture diagrams — system context, intelligence pipeline, provider fallback, data model, deployment |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | The LLM provider adapter — routing, fallback, capability detection, cost control |
| [`docs/ML_ENGINE.md`](docs/ML_ENGINE.md) | The deterministic intelligence pipeline — what's implemented, what's tested, bugs found and fixed |
| [`docs/EVALUATION.md`](docs/EVALUATION.md) | Test/eval results — deterministic suites, retrieval regression, live smoke tests |
| [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) | Top-level DONE/PARTIAL/BLOCKED/PLANNED status |
| [`docs/ui/SIH.md`](docs/ui/SIH.md) | The canonical problem statement and pipeline specification |
| [`docs/ui/`](docs/ui/) | Full UI specification — design system, IA, component spec, data/truth rules, accessibility |
| [`data/bis-standards-dataset/README.md`](data/bis-standards-dataset/README.md) | Provenance and fact-check notes for the seed standards dataset |
| [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) | Instructions for AI coding agents working in this repo |

## Tech stack

Next.js 16 (App Router) · TypeScript · Neon Postgres + pgvector · Drizzle ORM · Vercel AI SDK · Tailwind CSS v4 · Vitest + React Testing Library
