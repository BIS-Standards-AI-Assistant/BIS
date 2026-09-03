# P1 Implementation Audit

Written before further P1 implementation (2026-09-03), per prompts/p1.md's
own Phase 0 requirement. Everything below was checked against the live
database and the current code, not assumed from documentation.

## 1. Current capabilities (verified live, this session)

- `relationships` table already has the exact generic model P1-A/A1 asks
  for: `sourceEntityType/Id`, `relationshipType`, `targetEntityType/Id`,
  `documentId`, `sourceId`, `evidenceText`, `confidence`,
  `verificationStatus`, `createdAt`/`updatedAt` — **no schema migration
  was needed for P1-A**.
- `src/lib/knowledge-graph.ts` already defines `RELATIONSHIP_TYPES`
  including `STANDARD_REFERENCES_STANDARD`, `STANDARD_SUPERSEDES_STANDARD`,
  `STANDARD_PART_OF_STANDARD`, `DOCUMENT_AMENDS_DOCUMENT`,
  `DOCUMENT_REVISES_STANDARD` — the vocabulary existed, but until this
  session **no script ever populated any of them**; only the two FK-mirror
  types (`STANDARD_HAS_PRODUCT_MANUAL`, `STANDARD_SUBJECT_TO_QCO`) had
  data.
- `validateRelationshipCandidate` (same file) already enforces: known
  type, evidence required (`documentId` or `sourceId`), non-empty
  `evidenceText`, no self-loops, confidence in [0,1] — this is A2/A4/A5's
  anti-fabrication gate, already built and already tested
  (`knowledge-graph.test.ts`).
- `getNeighbors()` (`src/lib/graph/graph-retrieval.ts`) is fully generic
  over relationship type and already wired into `/api/v1/query` via
  `query-pipeline.ts` — **P1-I's "graph must become useful to the query
  engine" was already true by construction**; it just had almost nothing
  to return before this session's extraction pass (only 4 documents' and
  46 QCOs' edges existed).
- P0 (this session, immediately prior) already built: the applicability
  engine (`src/lib/applicability.ts`), deterministic
  certification/testing reachability via the existing `getCertificationScheme`
  tool, `knowledgeBoundary` classification, and server-scoped chat context.
  These satisfy meaningful parts of P1-B (applicability integration,
  already using coverage+grounding), P1-D (certification data is already
  structured and query-reachable), and P1-L (Knowledge Boundary already
  exists and is populated on every query).

## 2. Missing schema

None required for what this pass implements. Genuinely missing for
later P1 phases:

- No `laboratories` table (confirmed in the P0 audit; unchanged).
- No amendment/version/supersession fields beyond `standards.editionYear`
  (a single free-text field) and `standards.status` (free text, almost
  entirely null in the live data — checked: 0 of 51 standards have a
  non-null `status`).
- No scope/applicability structured table (`products[]`, `materials[]`,
  `inclusions[]`, `exclusions[]` per P1-B1) — P0's applicability engine
  works directly off `coverage` + the candidate title text, not a
  separate stored scope record.
- No legal/regulatory entity tables (`REGULATION`, `ORDER`,
  `GAZETTE_NOTIFICATION` per P1-E) beyond the existing `qcos` table.

## 3. Existing reusable structures

- `resolveStandardIds()` (`src/lib/standards-id.ts`) — the same
  deterministic identifier parser the retrieval pipeline already uses —
  is directly reusable for `STANDARD_REFERENCES_STANDARD` extraction: run
  it over each ingested chunk's text, match hits against real
  `standards.canonicalNumber` rows only (never a fuzzy/normalized-only
  match, to avoid the exact wrong-edition mistake this session's data
  acquisition batch already caught and quarantined once).
- `scripts/data-relationships.ts`'s `insertIfValid`/`relationshipExists`
  pattern (validate → dedupe-check → insert, fully idempotent) is the
  established convention; extended rather than replaced.

## 4. Data availability (the real constraint)

Live counts at audit time: 51 standards, 19 documents, 557 chunks, 46
QCOs, 4 certification schemes, 65 relationships (before this pass), 44
sources, 20 golden queries. Checked specifically for P1:

- **Sibling/part families** (standards sharing a base `normalizedNumber`):
  only 2 families exist in the current data — "302" (3 section-level
  parts of IS 302 Part 2) and "2553" (Parts 1 and 2). No umbrella "base"
  standard row exists for either family, so a literal `PART_OF` edge
  (part → base) has no valid target; the honest relationship is
  `STANDARD_RELATED_TO_STANDARD` between siblings — a new, minimal
  vocabulary addition (see §P1-A below), not a fabricated hierarchy.
- **Cross-references in ingested text**: checked live — 12 exact
  `IS <number>[:<year>]` mentions inside the 557 ingested chunks resolve
  to another *real* standard row (not a fuzzy match, not a false
  positive from a page number or clause number).
- **Amendment/version/temporal evidence**: none. Every one of the 51
  standards is a single edition record with no amendment number, no
  supersession relationship, and no effective/superseded date. This is
  not a bug to fix in code — it is the honest state of a 51-standard,
  19-document corpus that has not yet ingested amendment notices or
  multi-edition history. P1-F/G/E cannot be implemented against real
  data this pass; see §8.
- **Legal/regulatory sources**: the `qcos` table already carries
  `notificationDate`/`effectiveDate` for some rows (real QCO dataset
  fields), which is genuine P1-E/G-adjacent data already present via
  the existing QCO pipeline — not new, but worth noting as already
  partially satisfying "temporal fields populated only from verified
  sources."

## 5. Official source availability

Same official BIS Product Manual corpus this session's data-acquisition
work already indexed (`docs/DATA_ACQUISITION_PLAN.md`). No new official
source category (gazette notifications, amendment orders) has been
fetched in this pass — building P1-E/F against real data is a *data
acquisition* task first, an *engineering* task second, matching P1-O's
own instruction to reuse the existing acquisition pipeline rather than
build new infrastructure ahead of having something to point it at.

## 6. Risks

- A naive "any two standards sharing a number are related" rule would
  over-match if the corpus grows (e.g. two genuinely unrelated 4-digit
  numbers coinciding by base number is not possible for IS numbers, but
  worth flagging as a scaling risk if `normalizedNumber` collisions ever
  become more common — not observed in the current 51-row table).
- `STANDARD_REFERENCES_STANDARD` extraction risks false positives from a
  standard number appearing in a table/annex as an unrelated
  cross-reference (e.g. a materials table listing several standards).
  Mitigated by requiring an *exact* canonicalNumber match (not
  normalizedNumber) and by keeping every extracted edge at
  `verificationStatus: "needs_review"`, never `"verified"` — per A4,
  candidate and verified relationships must not be mixed.

## 7. Implementation plan for this pass

Given the data constraints in §4, this pass implements only what real
evidence supports:

1. Add `STANDARD_RELATED_TO_STANDARD` to the relationship vocabulary
   (P1-A).
2. `scripts/data-relationships-extract.ts`: deterministic extraction of
   (a) sibling/part-family `STANDARD_RELATED_TO_STANDARD` edges and (b)
   `STANDARD_REFERENCES_STANDARD` edges from ingested chunk text, both
   gated by `validateRelationshipCandidate`, both `needs_review`.
3. No code changes needed for P1-I (graph retrieval) — already generic;
   verified live that the new edges are returned through the existing
   `/api/v1/query` → `graphNeighbors` path.
4. Everything else in prompts/p1.md (P1-B structured scope tables, P1-C
   structured testing-method extraction beyond P0's certification-scheme
   testingParameters, P1-D beyond what P0 already wired, P1-E legal
   mapping, P1-F/G amendment/version/temporal, P1-J new query-planner
   intents, P1-K answer compiler beyond what P0's evidence-only path
   already does) is **not implemented this pass** — see the completion
   report's "remaining gaps" section for why, per item.

## 8. What cannot honestly be implemented because data is missing

- P1-E (legal/regulatory mapping beyond existing QCO rows): no gazette
  notification source has been ingested.
- P1-F/G (amendment/version/temporal intelligence): zero amendment or
  supersession evidence exists in the corpus; building the data model
  without data to populate it would be exactly the "empty abstraction"
  prompts/p1.md's own final section forbids.
- P1-C (structured per-test-method extraction with clause/equipment
  fields): the 4 `key_testing_parameters` strings per certification
  scheme (already reachable via P0) are the only testing evidence
  currently structured; per-clause test-method extraction from raw
  chunk text would require new extraction logic against unverified
  free text and is out of scope for this pass's time budget — flagged,
  not silently skipped.
