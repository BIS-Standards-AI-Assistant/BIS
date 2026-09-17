# Production Audit — BIS Standards Navigator

Date: 2026-09-16. Branch: `production` (branched from `client`, which carries every commit
described below and is deployed live at
[bis-standards-client.vercel.app](https://bis-standards-client.vercel.app)).

This audit follows `BIS_Navigator_PRODUCTION_BRANCH_EXECUTION.md`'s section 1. It records what
was actually inspected and found — nothing here is projected or assumed. Given the spec's own
49-section scope, this single session covered the audit itself plus the highest-value,
independently-verifiable fixes (rate limiting, a stray deploy-config file, an ESLint
false-positive). It explicitly does **not** claim completion of backup/restore drills, a full
accessibility pass, load testing, or a real authentication system — each is called out below as
a genuine blocker or a scoped-out item, not silently skipped.

---

## 1. Architecture (as it actually exists)

- **Framework**: Next.js 16 App Router, one deployable (UI + API routes, one process).
  `output: "standalone"` for Docker, explicitly gated off on Vercel
  (`process.env.VERCEL ? undefined : "standalone"`) — this gate is load-bearing; without it the
  Vercel build fails on a missing `.next/next-server.js.nft.json` (hit and fixed this session).
- **Database**: PostgreSQL + pgvector (Neon). Schema in `src/db/schema.ts`: `documents`,
  `chunks` (HNSW vector index), `query_logs`, `feedback` (new this session), plus the
  knowledge-graph tables (`standards`, `sources`, `qcos`, `relationships`,
  `certification_schemes`).
- **Retrieval**: pgvector semantic + Postgres FTS + RRF fusion, with a local-seed-file fallback
  (`src/lib/retrieval.ts`) when the DB query throws — this fallback path was the source of a
  citation-shape mismatch found and worked around this session (see Known Issues below).
- **Provider adapter**: `src/lib/providers/` — local (Ollama) → OpenRouter free → paid →
  evidence-only, retry limit 0, 60s cooldown per provider. Live-verified this session across all
  four paths.
- **Deployment**: Vercel (production alias `bis-standards-client.vercel.app`) + Docker
  (`docker-compose.yml`, two profiles: `openrouter`, `local`). Both verified live this session.

---

## 2. Authentication & Authorization — **the single largest gap against this spec**

**Finding: no authentication system exists anywhere in this codebase.** Verified by search
(`next-auth`, `clerk`, `auth0`, `passport`, `jsonwebtoken`, session-cookie handling — zero real
hits) and by direct inspection: every one of the 12 `/api/v1/*` routes is `PUBLIC`. There is no
`AUTHENTICATED`, `ADMIN`, or `INTERNAL` tier.

This is a **deliberate, pre-existing design choice**, not an oversight introduced this session —
`scripts/corpus-admin.ts` and `scripts/feedback-admin.ts` both explicitly document it: *"this
app has no authentication: an unauthenticated route that can [do X] would be a far worse defect
than the gap it fixes"* — which is why both of those admin-capability scripts were deliberately
built as CLI scripts (requiring shell access to deployment credentials) rather than HTTP
endpoints.

**Consequences for this spec's sections 5, 6, 43 (auth/authz, private-document isolation,
security test matrix's auth/authz rows):**

- There is no per-user account model, so "cross-user access," "cross-workspace access," and
  "session boundary" tests (§5, §43) have no subject to test against — the concept of "another
  user" does not exist in this app yet.
- The Sources panel's uploaded documents (§6) are scoped to `sessionStorage` in the browser, per
  tab, never persisted server-side against an account — so there is no server-side private-doc
  isolation to break, but also none to point to as evidence of correctness. This is **weaker**
  than the spec's expected model (`User → Workspace → Conversation → Document → Chunks →
  Embeddings`, server/DB-scoped), not equivalent to it.
- `/api/v1/feedback` (added this session) is public and rate-limited, but unauthenticated —
  anyone can submit feedback; nothing currently prevents spam beyond the existing IP-based rate
  limiter. Promotion into the training set still requires a human running
  `scripts/feedback-admin.ts` with shell access, which is the actual safeguard.

**This is a genuine release blocker against the spec's Definition of Done**, and building a real
multi-tenant auth system (sessions, per-user document scoping at the DB query layer, workspace
model) is a multi-session project of its own — not something to bolt on inside this audit
without the risk of doing it superficially. Recommendation: scope a dedicated
auth-and-multi-tenancy milestone before claiming this app is "production-ready" in the sense
this spec defines it. Until then, the honest position is: **this is a public, single-tenant
research tool, not a multi-user SaaS product**, and every feature should be described that way.

---

## 3. Security — findings and fixes this session

| Area | Finding | Action |
|---|---|---|
| Rate limiting | 3 of 12 routes (`certification-schemes`, `laboratories`, `standards/[id]`) had **no rate limiting at all** — an oversight, not a deliberate choice (every other route has it). | **Fixed** this session — all three now use the same `rateLimitOrNull` helper as the rest of the API, 60 req/min. Verified: existing route tests still pass. |
| Input validation | 9/12 routes use Zod; the 3 GET-only routes above use manual param handling (defensible — simple string query params, not request bodies) plus the newly-added rate limit. | No change needed beyond the rate-limit fix. |
| Upload security (`/api/v1/analyze-document`) | Size cap (10MB), MIME + extension allowlist, **magic-byte verification** (doesn't trust declared MIME alone), never reaches an LLM (no prompt-injection surface for this path). | Already solid — no gap found. |
| Upload security (`/api/v1/transcribe`) | Size cap (8MB), MIME allowlist, language allowlist (prevents forwarding arbitrary attacker-supplied values upstream), separately rate-limited via `@/lib/rate-limit` (a second, older rate-limit module — see Known Issues). | Already solid — no gap found. |
| SSRF | Searched for any user-controlled URL passed to `fetch()` — **zero hits**. The "web research" feature this spec's §9 assumes was never built (a prior session found no web-search provider is configured anywhere) — so there is currently no SSRF attack surface to hardened, because there is no URL-fetching-from-user-input feature at all. | N/A — documented as no-attack-surface, not "hardened." |
| Prompt injection | Documents/retrieved chunks are treated as untrusted data structurally — the LLM's response schema has no field for `groundingState`/citation identity, so even a successful prompt-injection of the prose step can't fabricate a verified citation. Live-tested this session: "ignore previous instructions," a DAN-style jailbreak, and a fabricated-standard query (`IS 99999:2099`) — all correctly refused/rejected. | Verified, no gap found. |
| Secrets | Grepped tracked source + all of `data/`, `docs/`, `scripts/` for API-key-shaped strings (`sk-or-v1-`, `sk-proj-`, `AIzaSy`, `ghp_`, Postgres connection strings) — zero hits. Checked `git log --all` for `env.download`/`.env.local` — never committed at any point in history. | Clean. |
| Startup env validation | `src/db/index.ts` uses `process.env.DATABASE_URL!` (a non-null assertion, not a real check) — a missing `DATABASE_URL` fails with an unclear error from deep inside the Neon driver, not a clean, typed startup error. Next.js on Vercel has no single "startup" phase to hook (serverless, per-request), so this needs a per-request or module-init guard, not a traditional app-boot check. | **Not fixed this session** — real gap, needs a small but deliberate design decision (fail on first request vs. a health-check-driven pattern), not a blind one-line patch. |
| CI/CD | `.github/workflows/ci.yml` exists (checkout → npm ci → typegen → typecheck → lint → build) but **only triggers on `master`** — every commit on `client`/`production` this entire session ran zero CI. It also doesn't run `npm run test`, dependency audit, or secret scanning. | **Not fixed this session** — flagged as a real gap; changing CI trigger branches and scope is a deliberate decision the repo owner should confirm, not something to silently change. |

---

## 4. Data integrity

- Reference dataset (`data/bis-standards-dataset/qco-standards.json`): 25 entries
  `verified_accurate` (fact-checked against upstream's own documented errors), 26 entries
  `needs_review` (imported from upstream, each flagged with which upstream claims are
  unconfirmed). No entry is silently upgraded past its real verification status — the UI badge
  logic was fixed in a prior session specifically to stop rendering `needs_review` in the same
  green style as `verified`.
- ML training data (`data/ml/datasets/query_document_relevance.jsonl`): grew from 1 to 65 real
  rows this session. **65 rows is still far below this project's own 300+ threshold** for a
  meaningful trained reranker — the trained candidate (`linear-reranker-candidate-v1`) ties the
  existing heuristic's own ceiling (17/17 leave-one-query-out), proving nothing beyond "the
  pipeline runs," not that it's better. It is **not** wired into production
  (`src/lib/ml/reranker.ts` is unchanged).
- Live DB counts (re-verified this session): 19 documents, 557 chunks, 51 standards.

---

## 5. Feature status vs. this spec's sections

| Spec section | Status | Evidence |
|---|---|---|
| §17 Retrieval | **PASS** | `IS 99999:2099` correctly returns no fabricated match; 12/12 recall, 8/8 no-false-identifier-match, re-run live this session |
| §18 Applicability | **PASS** | `steel pipes` vs. a PVC candidate correctly shows "related but not applicable" (a real bug found and fixed in a prior session, regression-tested since) |
| §19 Knowledge Boundary | **PASS** | `VERIFIED`/`PARTIALLY_SUPPORTED`/`NOT_IN_DATABASE`/`CONFLICTING_EVIDENCE`/`UNVERIFIED_SOURCE` all implemented and wired into `/api/v1/query` |
| §20 Evidence/citation validation | **PASS** | Standard-number and citation validation live-tested; 0/20 false-standard hallucinations across the full golden set this session |
| §21 LLM output validation | **PASS** | Response schema structurally excludes `groundingState`/confidence/citation-identity fields — verified by unit test, not just design intent |
| §22 ML production rules | **PASS** | Candidate reranker explicitly NOT swapped in; heuristic stays production; comparison against baseline documented in the model registry |
| §25 Product DNA | **NOT IMPLEMENTED as specified** | The spec wants progressive 8-dimension structured extraction (Material, User Base, Intended Use, ...). What exists is single-field NL query + LLM/deterministic intent extraction — real, but not the structured multi-field intake this section describes. |
| §29 HUID/Consumer verification | **PARTIAL** | Real sourced facts exist (`/e-services/consumer-services`, `/certification/hallmarking`) — BIS Care app, HUID six-digit verification described; no live HUID lookup integration (would need an official BIS API this app doesn't have credentials for) |
| §31 STT/TTS | **PARTIAL/BLOCKED** | STT: real, server-side fallback + browser Web Speech API, live-verified. TTS/Audio Overview: **not implemented** — no speech synthesis exists anywhere in this codebase (renders as "Planned" in the UI, not faked) |
| §5/§6 Auth, private-doc isolation | **BLOCKED** | See section 2 above — no auth system exists |
| §39 CI/CD | **PARTIAL** | Exists, but scoped to `master` only, no test/security stage — see section 3 above |
| §42 Backup/restore | **NOT ATTEMPTED** | Neon (the DB provider) has its own backup infrastructure; this session did not test a restore, and doing so against the live shared database would be destructive-adjacent and was not attempted without explicit authorization |

---

## 6. What this session actually changed on `production`

1. Added rate limiting to 3 previously-unprotected routes (`certification-schemes`,
   `laboratories`, `standards/[id]`).
2. Verified (did not need to fix): upload security, SSRF surface, prompt-injection resistance,
   secret hygiene.
3. Documented, did not fix: missing startup env validation, CI branch/scope gap, no-auth-system
   blocker.
4. This document.

## 7. Release scorecard (spec §46 format)

| Area | Status | Evidence |
|---|---|---|
| Build | PASS | `npm run build`, clean |
| Tests | PASS | `npx vitest run` — 570/570; ML deterministic suites — all passing |
| Lint / typecheck | PASS | `npm run lint`, `npx tsc --noEmit` — both clean |
| Database | PASS | Live queries verified against real Neon instance (19 docs/557 chunks/51 standards) |
| Security (this session's scope) | PASS | Rate-limit gap fixed; upload/SSRF/injection/secrets verified clean |
| Auth | **BLOCKED** | No auth system exists — see §2 |
| Private-document isolation | **BLOCKED** | No server-side scoping exists to test — see §2 |
| Retrieval | PASS | 12/12 recall, 8/8 no-false-match, live |
| Applicability | PASS | Material-mismatch regression verified |
| Grounding | PASS | 90.0% overall accuracy, 0/20 false-standard hallucinations |
| Documents (analyze-document) | PASS | Upload validation verified |
| STT | PASS (with provider) | Live-verified |
| TTS | **BLOCKED** | Not implemented, no provider |
| Deployment | PASS | Live, smoke-tested this session (homepage, search, query, chat, consumer-services all 200 with real responses) |
| Backup/restore | **NOT ATTEMPTED** | See §5 table |
| CI (branch coverage) | **PARTIAL** | Exists, scoped to `master` only |

**Definition of Done, honestly assessed against this scorecard: not yet met.** The application
is deployable, evidence-grounded, and honest about its limitations — three of the four
adjectives in the spec's Definition of Done. It is not yet "secure" in the multi-tenant sense
the spec assumes (no auth), and "recoverable" (backup/restore) was not exercised this session.

---

## 8. Follow-up session — 2026-09-17

Scope: close the two safe, independently-verifiable gaps this audit flagged as "not fixed this
session," plus wire up the network-security piece needed for the "Vercel app + separate Ollama
VM" split deployment. **Auth/multi-tenancy is deliberately still out of scope** — §2's own
recommendation stands: building it superficially inside an unrelated session would be worse
than the gap it fixes.

| Item | Change |
|---|---|
| Startup env validation | `src/db/index.ts`'s `getDb()` now throws a clear, actionable error ("DATABASE_URL is not set...") instead of relying on `!` and letting a missing var fail deep inside the Neon driver. Unit-tested (`src/db/index.test.ts`). |
| CI branch coverage | `.github/workflows/ci.yml` now triggers on `production` and `client`, not just `master`. Added a `Test` step (`npm run test` — the same ML + vitest suite run locally) and a non-blocking `npm audit --omit=dev --audit-level=high` step, plus a cheap dependency-free grep for obviously live-secret-shaped strings. Still not a substitute for a real secret scanner, but this is real coverage where there was none. |
| Remote-Ollama auth | `src/lib/providers/local-provider.ts` now sends `LOCAL_LLM_API_KEY` as `Authorization: Bearer <key>` when set — needed because Ollama itself has no auth, and a production deployment can't run it on Vercel (serverless, no persistent process). New `deploy/ollama-vm/` runs Ollama on a separate VM behind a Caddy reverse proxy that checks this token before ever reaching Ollama. Same-machine/same-Docker-network Ollama (the existing `docker-compose.yml` `local` profile) is unaffected — the token stays unset there, and the network boundary is the protection. |

Both items were genuine gaps, not paperwork: the env-validation fix changes what a
misconfigured deploy actually reports, and the CI fix changes what commits actually get tested
before landing on the branch this app deploys from. Not fixed this session, still open: the
auth/multi-tenancy gap (§2), a real backup/restore drill, and a full secret-scanning tool (the
grep above catches known key-prefix patterns only, not arbitrary secrets).
