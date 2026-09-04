# Document Intelligence & Statistics — audit and plan

Written before code, per §3.

## 1. Audit

| Capability | Finding |
|---|---|
| Document upload + parsing | **Exists** — `/api/v1/analyze-document`, `pdf-parse`. Reuse; do not build a second pipeline (§3) |
| Extracted text | **Exists** — 557 `chunks` rows |
| Source metadata per chunk | **Exists** — `section`, `clause`, `page`, `text`. §27 traceability is groundable today |
| Table extraction | **Absent.** `pdf-parse` returns flowed text; no table structure. §7's "table-first" cannot be honoured until a table-aware parser is added |
| OCR | **Absent.** No image OCR, so §44/§45's scanned-document path has nothing behind it |
| Charting library | **Absent.** None in package.json |
| Python | **Absent.** This is a TypeScript/Next.js app end to end. §18 says to use Python "where Python execution is part of the existing architecture" — it is not, so **no Python layer is being added**; §19's module layout does not apply |
| Job queue | **Absent.** §55's async processing has no infrastructure; extraction currently must run inline |
| Statistics persistence | **Absent.** No table (§53) |
| Auth | **Absent.** §64's workspace authorization has no user to check |

## 2. What was built (P0, §68 items 2-5)

`src/lib/statistics/` — deterministic, no new dependencies:

- **`units.ts`** — normalisation that is *additive* (the original value and
  unit are never overwritten, §9) and *dimensionally closed*: every unit
  belongs to one dimension, so volts cannot become amps and °C cannot be
  compared with kg. `compareQuantities` returns null across dimensions
  rather than producing a number (§10).
- **`extract.ts`** — the §5 problem: a BIS document is dense with clause
  numbers, page numbers, standard ids and revision years, none of which are
  statistics. Extraction is therefore **unit-led and context-led, not
  number-led**. A number is promoted only with a recognised unit or an
  explicit quantitative construction, and is rejected outright inside a
  metadata phrase. Inequalities and ranges are read before bare
  measurements, so `≤ 20 kg` can never degrade into the observation
  `20 kg` — dropping an inequality turns a limit into a result.

46 tests cover §65's list: metadata rejection, decimals, negatives,
ranges, inequalities, tolerances, counts, all normalisation pairs,
dimensional refusal, source traceability and excerpt bounds.

## 3. Deliberate non-decisions

**No LLM extraction yet.** §56 permits it, but §57 then requires
programmatic proof that the value appears in the source — so the
deterministic layer must exist regardless, and it is the layer that can be
tested exhaustively. Adding the LLM pass on top is P1, and is gated on
`OPENROUTER_MODEL` (see TRANSFORMATION_PLAN.md §2.1).

**No charts yet.** §17 requires deterministic chart *selection* before any
chart is drawn, and §61 rules out charts without units or source
references. Selection logic comes before a charting dependency, not after.

## 4. Blocked on maintainer decisions

1. **Charting library** — a new frontend dependency. §18 says not to
   replace an existing one; there is none, so one must be chosen.
2. **Statistics persistence** — a migration for `extracted_statistics`
   with its source references (§53). Nothing persists without it.
3. **Table-aware PDF parsing** — §7 prioritises tables over prose, and the
   current parser produces neither table structure nor cell coordinates.
4. **Job queue** — §55 asks for async processing; there is no queue.
5. **Auth** — §64 workspace/document authorization.
6. **OCR** — §44/§45 scanned-document handling.

## 5. Order of remaining work (§68)

**P1** Statistics section UI, key metrics, technical tables, source detail
drawer, review queue — all buildable on what exists once persistence lands.

**P2** Chart-selection engine (deterministic, §17), then charts.

**P3** Multi-document aggregation, conflict detection (§31), duplicate
detection (§32), revision comparison, derived statistics with the `Derived`
badge (§26).

**P4** Ask AI from a statistic (§50 — the trust components and shared
conversation store already exist for this), export, report.
