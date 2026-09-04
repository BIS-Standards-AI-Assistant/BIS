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

## Not yet addressed (tracked for later passes)

- §8.1 — collect top-1 retrieval scores for 5–6 in-corpus and 3–4
  out-of-corpus queries against the live index; set an explicit top-1
  relevance floor from the gap; record the numbers. Harness can be a small
  `tsx` script over `retrieveChunks`.
- §9 — refusal-correctness eval (out-of-corpus set) and multilingual-parity
  eval (same question EN vs HI → same standards cited).
- FR12 — a document-removal path and/or a minimal admin endpoint.
- FR8 — evaluate a real cross-encoder re-ranker against the diversity
  re-ranker on the golden set; adopt only if it measurably helps.
- FR6 — ingest more of the PRD's actual corpus (public scheme docs, FAQs)
  under the "genuinely public + no fabrication" rules.
