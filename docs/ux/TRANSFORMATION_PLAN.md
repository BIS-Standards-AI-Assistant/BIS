# BIS Platform — UX Transformation: Audit and Plan

Written before any UI was changed, per §1 ("audit the existing application")
and §44 ("do not attempt everything randomly").

## 1. Audit findings

### Stack
| Item | Finding |
|---|---|
| Framework | Next.js 16.3.3 (App Router), React 19.2.8, TypeScript strict |
| Styling | Tailwind v4, 88 CSS custom properties in `src/app/globals.css` |
| Data | Drizzle + Postgres/pgvector; Zod at every API boundary |
| State | React only — `LanguageProvider` context, two `useSyncExternalStore` stores (`source-library`, `assistant-conversation`). No Redux/Zustand |
| Auth | **None.** No identity layer of any kind |
| Tests | 344 vitest across 40 files; 62 Playwright E2E |
| i18n | 8 languages wired (`src/lib/i18n.ts`), dictionary-based |

### Routes
20 pages, 9 API routes. The intelligence pipeline (`/api/v1/query`) is real and
works: query normalization → intent → hybrid retrieval → rerank → evidence
aggregation → coverage → grounding → confidence → answer, with citation
validation and abstention.

### Design system — the real gap
Colour tokens are good (semantic: navy/ink/surface/success/warning/danger/info
plus `-soft` variants). **Primitives are almost absent**: `src/components/ui/`
holds only `Badge`, `RelevanceMeter`, two logos and an icon set. There is no
Button, Input, Card, Dialog, Drawer, Tooltip, Table, Alert or Progress — every
page re-declares its own Tailwind strings. §26 cannot be met without building
these, and every later deliverable depends on them.

**No token expresses data provenance.** §9/§41 require official-source vs
AI-interpretation vs user-provided vs inference to be visually distinct. That
distinction does not exist in the codebase today, in tokens or components.

### What already exists and must be reused (§1.6)
| Spec item | Existing asset |
|---|---|
| Product DNA extraction | `QueryInterpretation` has fields for **product, material, useCase, targetUser, sector** — 4 of the 8 axes plus the product. **But see §2.1: they come back null in this environment.** |
| AI compliance results | `/api/v1/query` + `/api/v1/analyze-product` (VERIFIED/POTENTIAL/RELATED/UNKNOWN labels) |
| Explainability | `applicability.reason`, `grounding`, `coverage`, `limitations` are all already returned |
| Evidence/provenance | `EvidenceExcerpt` renders clause/page/sourceUrl |
| Document intelligence | `/api/v1/analyze-document` — real PDF/text parsing, deterministic identifier extraction |
| Global AI assistant | `BisChatBot` + `/api/v1/chat` + shared conversation store |
| Search | `/search` keyword mode + `/api/v1/search` |
| Confidence language | `src/lib/confidence.ts` already uses words, not fake percentages (§11 already satisfied) |

## 2. Data availability

**Updated after the maintainer supplied a new `.env.local` pointing at a
populated Neon database.** The original audit ran against a near-empty
database; those numbers and the conclusions drawn from them are superseded.

| Table | Rows (was) | Consequence |
|---|---|---|
| `documents` | 19 (19) | Retrieval works |
| `chunks` | 557 (557) | Evidence, clauses and excerpts are real |
| `standards` | **51** (0) | Standard records resolve — scoped chat works |
| `sources` | **44** (0) | Provenance has records behind it |
| `certificationSchemes` | **4** (0) | Some scheme data exists |
| `qcos` | **46** (0) | QCO status available |
| `relationships` | **70** (0) | **Knowledge graph has edges** |
| `queryLogs` | 953 | Real usage history |

Verified live on the new database:

- `/api/v1/query` for "stainless steel water bottle for children" returns
  four **verified** recommendations (IS 15757:2022, IS 2082:2018,
  IS 15410:2003, IS 13428:2005) at high confidence.
- `/api/v1/chat` scoped to `IS 15410:2003` now resolves it and returns three
  real evidence items. This had returned "not enough evidence" for every
  query throughout development.

**What this unblocks:** the compliance workspace, testing/certification
requirements, the source library's shared knowledge base, and the academic
knowledge graph (§23), which now has 70 edges to draw.

**Still absent, unchanged:** laboratory dataset and map provider (§15),
HUID/mark verification (§16), regulatory and laboratory operational data
(§21/§22), and any auth layer (§20).

### Deliverables by what they can honestly be built on

**Groundable in real data now** — Homepage, Product DNA, AI compliance results,
recommendation cards, explainability, provenance, document intelligence,
search, AI assistant, design system, error/empty/loading states, responsive
navigation.

**Architecture only — no backend or data exists** (§46: build the UI
architecture, label mock data, document the backend work):
| Deliverable | Missing |
|---|---|
| Laboratory discovery (§15) | No laboratory dataset **and** no map provider — `/api/v1/find-laboratories` already reports both blockers by design rather than fabricating |
| Consumer Scan & Verify (§16) | No HUID/mark verification backend, no camera/scan pipeline |
| Regulatory dashboard (§21) | No backlog, licensing, import or capacity data |
| Laboratory dashboard (§22) | No test requests, equipment or calibration data |
| Academic knowledge graph (§23) | `relationships` is empty |
| Role-based experiences (§20) | **No auth layer** — roles cannot be attached to a user |

Building these as if they worked would be exactly the "visually impressive
static pages" §46 forbids, and would breach CLAUDE.md's ban on invented BIS
standards, fees, laboratories and regulatory information.

### 2.1 Product DNA is blocked on extraction that does not currently run

Measured, not assumed. `POST /api/v1/query` with
`"stainless steel water bottle for children"` still returns:

```json
"interpretation": { "product": null, "material": null, "useCase": null,
                    "targetUser": null, "sector": null }
```

Every axis is null for a description that names a material, a product and a
user group. **This survived the new `.env.local`**, and the server log gives
the exact reason:

```
[llm-provider] all_providers_exhausted
  local           skipped: no_structured_output_capability
  openrouter-free skipped: no_structured_output_capability
  paid            skipped: no_structured_output_capability
```

`OPENROUTER_API_KEY` is set but **`OPENROUTER_MODEL` is not**. In
`openrouter-provider.ts` the model id defaults to `undefined`, and
structured-output capability is `modelId ? KNOWN_STRUCTURED_OUTPUT_MODELS.has(modelId) : false`
— so with no model id every provider is skipped before it is ever called.
Intent extraction needs structured output, so it falls through to
`deterministicIntentFallback()`, which sets only `intent`, `isRelevant`,
`certificationRequested` and `testingRequested` and never populates the
descriptive axes.

Two independent gaps, then:

1. **Config**: set `OPENROUTER_MODEL` to one of the three models the
   provider recognises for structured output — `openai/gpt-4o-mini`,
   `openai/gpt-4o`, `openai/gpt-4-turbo`. All are paid on OpenRouter, so
   this is a cost decision for the maintainer, not a default to assume.
2. **Code**: even with a model configured, the zero-cost path still extracts
   nothing. SIH.md §23 requires the system to be useful with no LLM at all,
   so `deterministicIntentFallback()` needs a real lexicon-based extractor
   regardless of which model is chosen.

This contradicts docs/ui/SIH.md §24, which records the deterministic
fallback as DONE with "keyword heuristics", and it directly blocks §5/§6:
a Product DNA wizard has nothing to extract and nothing to display.

**Two ways forward, and this is a decision for the maintainers:**

1. Make the LLM provider work in this environment (config, not code).
2. Build a real deterministic extractor for the axes — a lexicon over
   materials, user groups, uses and environments. This is what SIH.md §23's
   "Tier 0 — zero cost" requirement actually implies, and it is the option
   that survives having no LLM at all.

Until one of those lands, a Product DNA wizard would be a form the user
fills in unaided, with the AI contributing nothing — which is not the
feature §5 describes. **The wizard UI is therefore sequenced after the
extractor, not before it.**

## 3. Sequenced plan (follows §44)

### P0 — foundation
1. **Design system primitives** — Button, Input, Card, Alert, Progress, Tooltip,
   Dialog, Drawer, Table, plus the trust primitives below.
2. **Data-trust model as components** (§41) — `SourceTag`, `ProvenancePanel`,
   `ConfidenceIndicator`, `WhyPanel`, `AiAnswer`. Provenance becomes a type,
   not a styling convention.
3. Navigation restructured around goals (§3).
4. Homepage — "What are you working on?" (§4).
5. Product DNA wizard over the existing extraction (§5, §6).
6. AI compliance assessment replacing result dumping (§7).

### P1 — workflows
Compliance workspace, document intelligence, laboratory discovery (blocked-state
UI), advanced search.

### P2 — specialised
Consumer verification, regulatory/laboratory dashboards, knowledge graph, AIR
workflow. All gated on backend work listed above.

### P3 — optimisation
Multilingual layout resilience, low-bandwidth mode, accessibility to WCAG 2.2 AA,
performance.

## 4. Backend work this UX requires (§46.4)

0. **Make attribute extraction actually produce attributes** (§2.1) — the
   single highest-value unblock; Product DNA, the explainability panel's
   "matched on" section and role-aware defaults all depend on it.
1. Populate `standards`, and link `documents.standardId` — unblocks scoped chat,
   compliance workspace and most of Product DNA's output.
2. Populate `certificationSchemes` and `qcos` — unblocks testing/certification
   requirements.
3. Laboratory dataset + map provider — unblocks §15.
4. HUID/mark verification service — unblocks §16.
5. Regulatory and laboratory operational data — unblocks §21/§22.
6. Populate `relationships` — unblocks §23.
7. An auth/identity layer — unblocks §20 role-based experiences.
