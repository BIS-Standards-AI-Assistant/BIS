# PRD Conformance Analysis

Source PRD: **"Product Requirements Document — AI-Powered Intelligent
Assistant for Indian Standards & BIS Services" v1.0** (SIH26107), supplied
by the project owner on 2026-09-04. Audited requirement by requirement
against the codebase at branch `master`, reading the code rather than the
status docs.

## Framing

The PRD specifies a stack — FastAPI (Python), in-process FAISS, an
English-only embedding model, a cross-encoder re-ranker, a SQLite/Postgres
metadata store. The project uses **none** of these, and `CLAUDE.md`
explicitly overrides them: *"Preserve existing Next.js/TypeScript,
Neon/pgvector, retrieval, citation, and API architecture."* This analysis
therefore judges **behaviour** (FR1–FR17, the non-functionals, the
grounding/refusal and multilingual contracts) and treats stack choices as
superseded, not defects.

The codebase is also well beyond the PRD in places — a knowledge-graph
layer, a deterministic tool registry, a bounded agent orchestrator,
applicability analysis, an 8-language UI, voice/STT input. Those are out of
PRD scope, not defects.

## Current status (2026-09-09)

The table below is the ORIGINAL 2026-09-04 audit, kept as the baseline.
For what changed since, read the two dated sections that follow it. As of
2026-09-09 the still-open items are: FR8 (cross-encoder comparison, not
attempted by choice), FR6 (corpus expansion, a separate data track), the
under-10s latency NFR (met on the local provider, missed on Gemini), and multilingual strict
grounding parity (measured at 3/5; the §7 language contract itself passes
5/5).

## Status at audit (2026-09-04, before this session's fixes)

| ID | Requirement | Status |
|---|---|---|
| FR1 | NL queries in English & Hindi | Partial — English only; pipeline had no language handling |
| FR2 | Auto language detection + explicit fallback | Missing |
| FR3 | Inline citation to standard/clause/document | Done |
| FR4 | Below-threshold → explicit "not found in corpus" | Partial — 3 uncoordinated paths, no fixed string |
| FR5 | Session-scoped follow-ups | Done |
| FR6 | Corpus indexed with metadata | Partial — schema right, ~4 docs actually ingested |
| FR7 | Top-k semantic retrieval + min relevance threshold | Partial — top-k done, threshold effectively absent |
| FR8 | Re-rank before generation | Done (diversity re-ranker, not cross-encoder) |
| FR9 | Answers strictly grounded in retrieved chunks | Done (strong) |
| FR10 | Answer includes identifier + title + link | Done |
| FR11 | Answer in the query's language | Missing |
| FR12 | Add/update/remove docs (script) | Partial — add + change-detect; no delete/admin |
| FR13 | Log query, sources, answered-vs-refused | Partial — no outcome/language logged; only /query |
| FR14 | Chat-style interface | Divergent — evidence-synthesis layout + docked assistant (CLAUDE.md forbids chatbot identity) |
| FR15 | Visible, expandable source panel | Done |
| FR16 | Response latency on screen | Missing — measured & logged, never shown |
| FR17 | Language toggle (EN/HI min) | Partial — 8-language UI chrome only |
| NFR | Latency < 10 s | Unverified |
| NFR | Zero fabricated standard numbers | Done (strong) |
| NFR | Corpus boundary visible to user | Partial — no standing statement |
| NFR | 5–10k chunk scalability | Done (pgvector HNSW) |
| §7 | Translate-in / answer-in-language / citations untranslated | Missing |
| §8 | Strict grounding prompt | Done |
| §8 | Post-retrieval threshold + fixed refusal | Partial — blended score, hand-picked constant, no fixed string |
| §8 | Post-generation citation check | Partial — standard-number validity only |
| §8.1 | Threshold calibrated against real in/out-of-corpus queries | Missing |
| §9 | Eval: citation, refusal, latency, relevance, multilingual parity | Partial — retrieval only; generation blocked on credit |

## Rulings on the four open decisions

1. **Framing** — behaviour-only; FastAPI/FAISS stack superseded by `CLAUDE.md`. Adopted.
2. **FR14** — keep the evidence-synthesis results layout plus the existing docked assistant. `CLAUDE.md`'s "not an AI chatbot" rule wins. No change.
3. **Multilingual reach** — build Hindi end to end now, structured so the other 7 UI languages plug in without re-indexing.
4. **Corpus expansion** — separate data-engineering track, not part of this pass.

## Executed this session

See `docs/PROJECT_STATUS.md` → "PRD conformance pass" for the detail and
verification. Summary: FR16, FR13, the transparency NFR, FR2/FR11/§7
(Hindi), and the FR4/§8/§8c fixed-refusal wiring are now **done**. §8.1
calibration, the cross-encoder evaluation, and corpus expansion are
**not** done — the first needs a live DB + provider run; the other two are
separate tracks.

## Session 2026-09-09 — §8.1, §9, FR12, and a fabrication defect

Everything below was measured against the live Neon index (19 documents,
557 chunks) on 2026-09-09. Numbers are observed, not projected.

### §8.1 — refusal threshold: DONE, calibrated

Previously the only relevance gate was `grounding.ts`'s blended score,
which the PRD checklist warns against specifically ("Does the threshold
apply to the top-1 ... score specifically, not an average across all k?").
There is now an explicit top-1 floor.

The measurement problem had to be fixed first: nothing in the pipeline
carried an absolute relevance magnitude. `RetrievedChunk.score`,
`fusedScore` and `semanticScore` are all *rank reciprocals*, so the
nearest neighbour in a small corpus scores near the maximum however
irrelevant it is — the same defect already documented in `grounding.ts`.
`retrieveChunks` now also returns `semanticSimilarity`, the raw pgvector
cosine similarity, and the floor is applied to that.

`scripts/calibrate-refusal-threshold.ts` (`npm run eval:refusal-threshold`)
implements the PRD's manual method. Measured:

| Group | n | min | max |
|---|---|---|---|
| in-corpus | 7 | 0.5557 | 0.6716 |
| out-of-corpus | 5 | 0.1413 | 0.3493 |

Cleanly separated, gap 0.3493–0.5557. `RELEVANCE_FLOOR = 0.45`
(`src/lib/relevance-floor.ts`), just under the gap midpoint.

**The PRD's suggested 0.55 starting point would have been wrong here**, and
the PRD says to check exactly this. 0.55 sits *above* the weakest genuine
in-corpus query (0.5557, "stainless steel cookware specification") and
would have refused it.

The floor exempts deterministic identifier matches, which is empirically
required rather than a convenience — measured live, `"5522 2014"` scores
0.2913 and `"Indian Standard 14543"` 0.4476 while resolving to exactly the
right document. The exemption cannot be reached by a fabricated
identifier: `"IS 99999:2099"` produces zero identifier matches and 0.3349,
and is still refused. Covered by 10 unit tests in
`src/lib/relevance-floor.test.ts`, keyed to those real numbers.

Verified end to end: both on-topic-but-out-of-corpus queries now return the
fixed refusal (`refused_insufficient_evidence`) where they previously
produced a generated answer.

### §9 — refusal correctness: DONE, 12/12

`scripts/eval-refusal.ts` (`npm run eval:refusal`) asserts **both**
directions — out-of-corpus must refuse, in-corpus must not — because a
refusal eval that only tests refusals is passed by a system that refuses
everything. Result: 12/12.

It also flags any refusal that still puts a standard forward as a
*primary* recommendation, and that immediately caught a real defect. The
query "turbine blade coatings for aircraft jet engines" returned the fixed
"not found in the indexed corpus" answer while still marking
IS 15636:2012, IS 13428:2005 and IS 14756:2017 as `primaryRecommendation` —
so the refusal prose sat directly above three confident recommendation
cards. Cause: the applicability gate runs per candidate and never saw the
pipeline-level refusal. A forced refusal now demotes every candidate to
`INSUFFICIENT_EVIDENCE`, which is what the refusal copy already told the
user ("retrieved as loosely related context only"). Candidates are demoted
rather than dropped, so the evidence stays inspectable.

### §9 — multilingual parity: DONE, measured on the Tier-0 local provider

`scripts/eval-multilingual.ts` (`npm run eval:multilingual`) measures parity
on the **grounding**, not the prose: the same primary standard numbers and
the same outcome for the EN and HI forms of a question. §7 requires the
prose to differ and the identifiers not to, so it separately checks that
Hindi was detected, that it was actually translated, and that cited
identifiers stayed in Latin script.

Getting an honest number took three attempts, and the first two are worth
recording because both failure modes look like product defects and neither
is one:

1. **Unpaced run against Gemini — 0/5, meaningless.** All five Hindi runs
   reported `translated=false`. The free tier is capped at 20
   `generate_content` requests, and one 429 puts the provider in a 60s
   cooldown (`COOLDOWN_MS`, `src/lib/providers/router.ts`). Translation is
   the *first* call each request makes, so it is the call that consistently
   absorbs that cooldown while later calls in the same request find it
   expired — which is exactly how a spent quota disguises itself as
   "translation is broken". Verified by calling the translation path in
   isolation, where it returned a correct English translation immediately.
2. **Local Ollama at the default timeout — 1/5, still not a parity result.**
   Translation succeeded only 2/5, and the failures were
   `timeout: no response within 15000ms`. `LOCAL_LLM_TIMEOUT_MS` is already
   operator-tunable; a CPU-bound 3B model simply needs more than the 15s
   default. No code change was needed.
3. **Local Ollama (`llama3.2:3b`), `LOCAL_LLM_TIMEOUT_MS=90000`** — a clean
   run:

| Metric | Result |
|---|---|
| Hindi detected | 5/5 |
| Hindi translated to English before retrieval | 5/5 |
| Answer written in Hindi | 5/5 |
| Identifiers left in Latin script (§7) | 5/5 |
| Strict parity (identical primary standards + same outcome) | 3/5 |
| Partial parity (Hindi retrieved at least one of the English standards) | 4/5 |

The §7 contract holds completely. Strict grounding parity does not, and the
gap is real but narrower than 3/5 suggests: on the failures the Hindi side
generally retrieves the *correct* standard and differs in the surrounding
candidate set, because translation rewords the query and reranking then
sees a slightly different field. Both metrics are reported so that
difference is visible rather than averaged away. The numbers also move
between runs (2/5 then 3/5 strict on identical input) because a 3B model
translates nondeterministically — a larger translation model is the obvious
next lever, and this is the harness to measure it with.

One product improvement came out of this. When translation is unavailable
the pipeline still retrieves on the untranslated text, and the relevance
floor now correctly turns that noise into a refusal — but the generic "not
found in the indexed corpus" wording blamed the corpus for what was an
unavailable translation step. The pipeline now adds an explicit limitation,
in English or Hindi, saying which it was.

Both eval scripts also pace themselves now (`EVAL_PACE_MS`), and the
multilingual one reports translation success separately from parity, so an
infrastructure failure can never again be read as a product failure.

### Latency (NFR "under 10 seconds"): MET on the local provider, MISSED on Gemini

Measured end to end across the 12-query refusal eval, on both providers:

| Provider | median | max | over the 10s target |
|---|---|---|---|
| Local Ollama `llama3.2:3b` (Tier 0) | 6.9s | 12.2s | 2/12 |
| Gemini free tier (remote) | 16.2s | 80.4s | 7/12 |

So the NFR is essentially met by the architecture and missed by one
provider. Gemini is taking 20-35s per structured call and the pipeline
makes up to three (translate, intent, synthesis); some calls also fail JSON
parsing and retry through a second code path, doubling that call's cost.
The two remaining local outliers (11.9s, 12.2s) are both refusals that ran
a full intent-extraction call before the floor rejected the retrieval.

A structural fix landed on the way to these numbers: the pipeline was
generating an LLM answer **and then discarding it** on every below-floor
refusal — 106s and 82s for two out-of-corpus queries whose entire output is
a fixed string. `generateAnswer` now takes a `skipSynthesis` flag, set once
the floor has already decided the outcome, which cut one of those from 106s
to 26s on Gemini and makes a refusal the cheapest path rather than the
dearest. On the local provider the same two queries now run in 12.2s and
6.9s.

### FR12 — add/update/remove: DONE

`scripts/corpus-admin.ts` (`npm run corpus`) adds the missing removal and
inspection paths — `list`, `orphans` (indexed documents no longer in the
seed manifest, reported for review, never auto-deleted), and `remove`,
which prints what it will delete and requires typed confirmation. Deletion
cascades to chunks and embeddings. Verified live against the real index.

Deliberately a script, not an HTTP endpoint. The PRD allows either; this
app has no authentication, and an unauthenticated route that can delete
indexed documents would be a worse defect than the gap it closes.

### Fabrication defect found and fixed (not a PRD gap — a rule violation)

`generateComplianceMap` in `query-pipeline.ts` fabricated its entire
output and rendered it as fact in the Product Compliance Map panel:

- a hardcoded `"ISI Mark Scheme (Scheme-I)"` / `"Mandatory (QCO Active)"`
  certification row attached to **every** result, whatever the standard
- two invented test names against invented clause numbers
  (`"Section 4.1"`, `"Section 5"`)
- a laboratory list with coordinates generated by `Math.random()`, plotted
  on a Leaflet map and captioned "capable of testing against the
  identified standards"

This violated `CLAUDE.md`'s "no invented ... clauses, certification
routes, testing requirements" rule and the PRD's zero-fabrication NFR, and
it contradicted the rest of the codebase, which is careful about exactly
this — `map-provider.ts` refuses to return fabricated coordinates, and
`find-laboratories` refuses to claim a per-standard capability match.

Replaced by `src/lib/compliance-map.ts`, which reads the fact-checked
reference dataset and nothing else, matching on exact standard number
*including edition*. Fields that cannot be sourced no longer exist on the
type rather than being filled with plausible values. Standards with no
reference entry are reported as `unmatchedStandards` and the panel says so
explicitly, because an empty section must not read as "no certification
required". 8 regression tests in `src/lib/compliance-map.test.ts` run
against the real dataset.

The laboratory map is gone. The recognised-laboratory dataset has no
coordinates and no per-standard testing scope, so there was no honest map
to draw; the Labs tab now fetches the real directory from
`/api/v1/laboratories` and states that it is *not* filtered by the
standards above, following the same reasoning as the existing
`LaboratoriesDirectory` component. `LaboratoryMap.tsx` and
`LaboratoryMapInner.tsx` were deleted. (`leaflet`/`react-leaflet` are now
unused and can be dropped on any future dependency pass.)

## Not yet addressed (tracked for later passes)

- **FR8 — cross-encoder re-ranker.** Not evaluated. The existing A/B
  harness (`npm run eval:reranker`) was re-run this session: the
  document-diversity re-ranker still measures 12/12 recall against the
  no-op baseline's 11/12, so re-ranking itself — which is what FR8
  actually requires — is done and working, and unaffected by this
  session's retrieval changes. Adding a *cross-encoder* to compare against
  it means a new ONNX/transformers runtime and a downloaded model, which
  is a real dependency decision against SIH.md §23's Tier-0 constraint —
  deliberately not taken unasked.
- **FR6 — corpus expansion.** 19 documents indexed. Ingesting more of the
  PRD's stated corpus (public scheme docs, FAQs, circulars) is a
  data-acquisition track, not a code change; see
  `docs/DATA_ACQUISITION_PLAN.md`. Everything above is calibrated against
  the current corpus and must be **re-run after any corpus change** — the
  relevance floor in particular is only valid for the configuration
  recorded in `data/evaluation/refusal-calibration.json`.
- **Latency NFR on the Gemini free tier.** Met on the local Tier-0
  provider (median 6.9s); missed on Gemini (median 16.2s). Provider-side,
  not a pipeline-structure problem.
- **Multilingual strict parity (3/5).** Real gap, measured. The likely
  lever is a stronger translation model than the 3B local one, not a
  pipeline change; the harness is in place to check that.
