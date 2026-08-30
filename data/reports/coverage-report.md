# BIS Knowledge Graph — Coverage Report

Generated: 2026-08-30T07:31:32.777Z

Every number below is a live count from the database at generation time —
none of this is projected or estimated.

## Totals

| Entity | Count |
|---|---|
| Standards | 25 |
| Documents (ingested, retrieval-indexed) | 4 |
| Chunks | 142 |
| Certification schemes | 3 |
| QCOs | 21 |
| Relationships | 0 |
| Sources | 22 |

## Verification status

| Metric | Value |
|---|---|
| Verified standards | 25 / 25 |
| Standards needing review | 0 / 25 |
| Verified relationships | 0 / 0 |
| Relationships needing review | 0 / 0 |

## Graph density (§39 — which standards are worth prioritizing next)

| Metric | Value |
|---|---|
| Standards with at least one ingested document | 4 / 25 |
| Standards with at least one QCO relationship | 21 / 25 |
| Standards with zero documents AND zero QCOs (lowest graph density) | 1 |

## Coverage by classification/domain

- Electrical Appliances: 3
- (unclassified): 3
- Food & Beverages: 2
- Electronics: 2
- Solar Energy: 2
- Precious Metals: 2
- Civil Construction: 2
- Dairy: 1
- Dairy & Nutrition: 1
- Electronics & IT: 1
- Telecommunications: 1
- Household Electronics: 1
- Household Appliances: 1
- Safety Gear: 1
- PPE: 1
- Industrial PPE: 1

## Known gaps (stated honestly, not glossed over)

- No laboratory data collected yet (`laboratories` table does not exist).
- No committee data collected yet.
- No amendment/revision graph populated yet — all 25 standards are single, undated edition records.
- Relationship count above (0) reflects that no automated relationship-extraction script has been built yet — every relationship row, if any, was inserted manually or by a one-off script, not a repeatable pipeline stage.
- `data/manifests/discovered-sources.json` contains candidate URLs found via sitemap crawling, all `needs_review` — none have been downloaded, confirmed, or extracted from.
