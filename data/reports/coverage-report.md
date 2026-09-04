# BIS Knowledge Graph — Coverage Report

Generated: 2026-09-04T07:09:30.272Z

Every number below is a live count from the database at generation time —
none of this is projected or estimated.

## Totals

| Entity | Count |
|---|---|
| Standards | 0 |
| Documents (ingested, retrieval-indexed) | 19 |
| Chunks | 557 |
| Certification schemes | 0 |
| QCOs | 0 |
| Relationships | 0 |
| Sources | 0 |

## Verification status

| Metric | Value |
|---|---|
| Verified standards | 0 / 0 |
| Standards needing review | 0 / 0 |
| Verified relationships | 0 / 0 |
| Relationships needing review | 0 / 0 |

## Graph density (§39 — which standards are worth prioritizing next)

| Metric | Value |
|---|---|
| Standards with at least one ingested document | 0 / 0 |
| Standards with at least one QCO relationship | 0 / 0 |
| Standards with zero documents AND zero QCOs (lowest graph density) | 0 |

## Coverage by classification/domain



## Known gaps (stated honestly, not glossed over)

- No laboratory data collected yet (`laboratories` table does not exist).
- No committee data collected yet.
- No amendment/revision graph populated yet — all 0 standards are single, undated edition records.
- Relationship count above (0) comes from two sources: `scripts/data-relationships.ts` materializes structural FK-mirror edges (STANDARD_HAS_PRODUCT_MANUAL, STANDARD_SUBJECT_TO_QCO), and `scripts/data-relationships-extract.ts` (added P1-A, 2026-09-03) does real text-based extraction — STANDARD_RELATED_TO_STANDARD from shared base identifiers, STANDARD_REFERENCES_STANDARD from ingested chunk text naming another real standard — both kept at `needs_review`, never auto-verified. No amendment/supersession evidence exists in the corpus yet, so STANDARD_SUPERSEDES_STANDARD/DOCUMENT_AMENDS_DOCUMENT remain unpopulated — that is a data gap, not a missing script.
- `data/manifests/discovered-sources.json` contains candidate URLs found via sitemap crawling, all `needs_review` — none have been downloaded, confirmed, or extracted from.
