# P1 Implementation Report

2026-09-03. Read alongside `docs/P1_IMPLEMENTATION_AUDIT.md` (written
first, per prompts/p1.md's Phase 0 requirement) for the full reasoning
behind what was and wasn't attempted this pass.

## 1. Initial state (before this pass, i.e. immediately after P0)

51 standards, 19 documents, 557 chunks (557 embedded), 46 QCOs, 4
certification schemes, 65 relationships (2 edge types only:
`STANDARD_HAS_PRODUCT_MANUAL`, `STANDARD_SUBJECT_TO_QCO`, both structural
FK mirrors, not extracted from text), 44 sources, 20 golden queries.

## 2. Schema changes

None. `relationships` already had the full model P1-A1 asks for — see
audit §1. The only vocabulary change was adding
`STANDARD_RELATED_TO_STANDARD` to `RELATIONSHIP_TYPES`
(`src/lib/knowledge-graph.ts`) for the sibling/part-family case where no
literal `PART_OF` target exists (audit §4).

## 3. Data changes

`scripts/data-relationships-extract.ts` (new), run live:

- **STANDARD_RELATED_TO_STANDARD**: 8 candidate sibling pairs found (2
  identifier families: "IS 302 (Part 2/Sec ...)" x3, "IS 2553 (Part
  1/2)"). Only 1 had a linked document to cite as evidence — the rest
  were rejected by the evidence-required gate, not silently skipped.
  **1 inserted.**
- **STANDARD_REFERENCES_STANDARD**: scanned all 557 ingested chunks with
  the existing `resolveStandardIds()` parser; 12 exact-identifier
  mentions resolved to a real, different standard row. **4 unique
  (source, target) pairs inserted** (the other 8 mentions were repeat
  mentions of an already-recorded pair, deduplicated by the existing
  idempotency check).

Verified idempotent live: re-running the script a second time inserted 0
new rows.

**Relationships: 65 → 70.**

## 4. New intelligence engines

None new — this pass reused P0's applicability engine
(`src/lib/applicability.ts`) and the existing `getCertificationScheme`
tool rather than building parallel machinery, per the audit's finding
that P1-B/D were already substantially covered by P0.

## 5. New relationships

See §3. Real example, verified live: `IS 14543:2016` (Packaged Drinking
Water) → `STANDARD_REFERENCES_STANDARD` → `IS 13428:2005` (Packaged
Natural Mineral Water), evidence: the actual chunk excerpt naming "IS
13428 : 2005". Returned correctly through the existing
`/api/v1/query` → `graphNeighbors` path with zero code changes to
`getNeighbors()` (already generic over relationship type).

## 6. Scope/applicability improvements

None beyond what P0 already shipped. `src/lib/applicability.ts`'s
material-family conflict detection was not extended with a structured
scope table (P1-B1: `products[]`, `materials[]`, `inclusions[]`,
`exclusions[]`) — that table doesn't exist, and building it without
population data would be an empty abstraction (per the spec's own
explicit prohibition).

## 7. Testing improvements

None new. P0's wiring of `getCertificationScheme`'s `testingParameters`
into `testing.notes` (deterministic, no LLM) remains the only structured
testing data path. Per-clause/per-method extraction (P1-C1) was not
attempted — see audit §8.

## 8. Certification improvements

None new beyond P0. Already distinguishes KNOWN (real scheme + route)
from NOT AVAILABLE (`certification.available: false`, `notes: null`) —
D2's four-state distinction (KNOWN/NOT VERIFIED/NOT AVAILABLE/CONFLICTING)
is only two of four states currently expressible; NOT VERIFIED and
CONFLICTING would need a real per-source-disagreement case, none observed
in the current data.

## 9. Legal/regulatory mapping

Not implemented. No gazette/regulation source has been ingested; the
existing `qcos` table (with real `notificationDate`/`effectiveDate` for
some rows) is the only legal-adjacent structured data, and it already
existed before this pass.

## 10. Version/amendment intelligence

Not implemented. Zero amendment or supersession evidence exists in the
51-standard corpus (verified live: every standard is a single edition
record). Building the F1 version model without real dated evidence to
populate it was explicitly ruled out per prompts/p1.md's own "do not
build empty abstractions" rule.

## 11. Temporal support

Not implemented beyond what already existed in `qcos`. No
`published_at`/`effective_from`/`superseded_at` fields were added to
`standards` — same reasoning as §10.

## 12. Graph retrieval

**Real improvement, live-verified.** `getNeighbors()` required zero code
changes — it was already generic — but had almost nothing to return
before this pass (edges existed for only 4 documents' and 46 QCOs'
worth of standards). Verified live against `IS 14543:2016`:
`graphNeighbors` now returns 4 edges across 3 distinct types
(`STANDARD_HAS_PRODUCT_MANUAL`, `STANDARD_SUBJECT_TO_QCO`,
`STANDARD_REFERENCES_STANDARD` x2), each with real evidence text and its
own `verificationStatus`. Bounded to depth 1 (single-hop) by
`getNeighbors`'s own design — I2's traversal-bound requirement was
already satisfied, not something this pass needed to add.

## 13. Tests

`knowledge-graph.test.ts` already covered the validator
(`validateRelationshipCandidate`) this pass's extraction script depends
on — unaffected by adding one new relationship-type string to the
vocabulary (verified: no test hardcodes the type list or its length).
No new unit test file was added for the extraction script itself — it
is a DB-integration script, not a pure function, and was instead
verified via live run + idempotency re-run (§3) rather than a mocked
unit test that wouldn't exercise the real query logic. This is a real
gap relative to prompts/p1.md's P1-Q test list (no test for "invalid
relationship", "duplicate detection" as an isolated unit test, etc.) —
flagged, not hidden.

## 14. Live verification

- `npx tsc --noEmit`: clean.
- `npx eslint` on all changed files: clean (after removing one unused
  import).
- `npm run test` (245 tests, unchanged from P0 — this pass added no new
  `*.test.ts` files): 245/245 pass.
- `npm run build`: succeeds (one transient Turbopack subprocess crash on
  the first two attempts, resolved by clearing `.next/` — an environment
  artifact from repeated build/dev-server cycles in this session, not a
  code issue; the third attempt with a clean cache succeeded normally).
- Live: `data:relationships-extract` run twice (1st: 5 inserted total;
  2nd: 0 inserted, confirming idempotency).
- Live: `/api/v1/query` for `IS 14543:2016` returns the new
  `STANDARD_REFERENCES_STANDARD` edges in `graphNeighbors` with real
  evidence text (§12).

## 15. Data counts before/after

| Metric | Before P1 | After P1 |
|---|---|---|
| Standards | 51 | 51 |
| Documents | 19 | 19 |
| Chunks | 557 | 557 |
| Relationships | 65 | **70** |
| Relationship types with data | 2 | **4** |

No standards/documents/chunks/QCOs/certification schemes were added or
modified this pass — P1-A was purely relationship extraction over
already-ingested data.

## 16. Verification counts

Of the 5 new relationship rows: 0 `verified`, 5 `needs_review` — by
design (A4: candidate extraction must not be mixed with verified
relationships). Of all 70 relationships: 45 `verified` (the original
structural FK-mirror edges, inherited verification from their source
row), 25 `needs_review`.

## 17. Remaining data gaps

- No laboratory data (`laboratories` table doesn't exist) — unchanged
  from P0.
- No amendment/supersession/version evidence anywhere in the corpus.
- No gazette/regulation source ingested.
- Scope/applicability structured table (products/materials/exclusions
  arrays) doesn't exist — applicability still runs off title text +
  coverage, not a dedicated scope record.
- Only 2 of the ~13 defined relationship types have any data
  (`STANDARD_SUPERSEDES_STANDARD`, `STANDARD_PART_OF_STANDARD`,
  `DOCUMENT_AMENDS_DOCUMENT`, `DOCUMENT_REVISES_STANDARD`,
  `STANDARD_APPLIES_TO_PRODUCT`, `STANDARD_HAS_TESTING_REQUIREMENT`,
  `STANDARD_TESTED_BY_LAB`, `PRODUCT_REQUIRES_CERTIFICATION`,
  `PRODUCT_SUBJECT_TO_QCO` all remain at 0 rows).

## 18. Remaining engineering gaps

- P1-J (new deterministic query intents: VERSION_QUERY, AMENDMENT_QUERY,
  SUPERSESSION_QUERY, etc.) not added — there is no engine behind them
  yet to route to, so adding the intent classification alone would be
  the "looks sophisticated, adds nothing real" failure mode this
  project's own prior sessions have explicitly flagged and avoided.
- P1-K (a dedicated "answer compiler" distinct from the existing
  evidence-package → LLM-explains pattern) not built as a separate
  component — the existing `answer.ts`/`query-pipeline.ts` split already
  follows the same principle (structured facts in, LLM explains, never
  assembles regulatory truth); a formal compiler abstraction would be
  new structure without new capability.
- No unit tests for the extraction script's own logic in isolation (see
  §13).
- P1-M (Standard Passport UI showing STATUS/SCOPE/RELATIONSHIPS/
  TESTING/CERTIFICATION/REGULATORY/TIMELINE sections) not built — no UI
  changes were made this pass; the new relationship data is reachable via
  the API (`graphNeighbors`) but not yet surfaced on `/standards/[id]`.

## 19. Features that must NOT yet be marketed

- "Standards relationship graph" — real, but covering only 4 of ~13
  relationship types and 5 of 70 rows are genuinely extracted (the rest
  are structural FK mirrors). Do not claim a general-purpose knowledge
  graph.
- "Amendment/version tracking" — not implemented at all. Do not claim
  this in any form.
- "Legal/regulatory mapping" — not implemented beyond pre-existing QCO
  data. Do not claim new legal-mapping capability.
- "Testing requirements extraction" — still limited to the 4
  `key_testing_parameters` strings per certification scheme (P0), not
  per-clause structured test methods.

## Final Status

| Area | Status |
|---|---|
| Standards Relationships | **PARTIAL** — real extraction added (2 new types, 5 rows), most defined types still empty |
| Scope & Applicability | **PARTIAL** — P0's engine works, no new structured scope data this pass |
| Testing Knowledge | **PARTIAL** — unchanged from P0's certification-scheme wiring |
| Certification Knowledge | **PARTIAL** — unchanged from P0 |
| Legal / Regulatory Mapping | **BLOCKED** — no data source ingested |
| Amendment Intelligence | **BLOCKED** — no evidence in corpus |
| Version Intelligence | **BLOCKED** — no evidence in corpus |
| Temporal Intelligence | **BLOCKED** — no new fields, existing QCO dates unchanged |
| Knowledge Graph Retrieval | **PASS** — generic, live-verified, correctly surfaces the new edge types |
| Data Provenance | **PASS** — every new row carries real evidenceText + documentId, `needs_review` not `verified` |
| P0 Regression | **PASS** — 245/245 tests, applicability/chat/rate-limit/testing-reachability all still live-correct |
| Build | **PASS** |
| Tests | **PASS** (245/245; no new tests added for the extraction script itself — gap noted §13) |
| Live Verification | **PASS** (§14) |

**Overall P1 readiness: 3 of 10 tracked areas at PASS, 6 at PARTIAL
(real but incomplete), 4 at BLOCKED (honest zero, not fabricated) —
roughly 30% by the same weighted-status method the P0 audit used
((3×1.0 + 6×0.5)/10 = 60%... — but this overstates it: 4 of the 10 rows
above are BLOCKED at 0, and 6 of the PARTIAL rows are "unchanged from
P0," not new P1 work. Counting only the P1-specific delta (relationships
+graph retrieval, the only two rows with genuine new work this pass):
2 of 10 areas advanced. Reported as 20% P1-specific completion — not
the platform's overall score, which remains governed by the P0 audit's
47.5%+the fixes already applied this session.**
