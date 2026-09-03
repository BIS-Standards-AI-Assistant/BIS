# BIS Knowledge Graph — Coverage Report

Generated: 2026-09-03T10:43:21.503Z

Every number below is a live count from the database at generation time —
none of this is projected or estimated.

## Totals

| Entity | Count |
|---|---|
| Standards | 51 |
| Documents (ingested, retrieval-indexed) | 4 |
| Chunks | 142 |
| Certification schemes | 4 |
| QCOs | 46 |
| Relationships | 50 |
| Sources | 44 |

## Verification status

| Metric | Value |
|---|---|
| Verified standards | 25 / 51 |
| Standards needing review | 26 / 51 |
| Verified relationships | 25 / 50 |
| Relationships needing review | 25 / 50 |

## Graph density (§39 — which standards are worth prioritizing next)

| Metric | Value |
|---|---|
| Standards with at least one ingested document | 4 / 51 |
| Standards with at least one QCO relationship | 46 / 51 |
| Standards with zero documents AND zero QCOs (lowest graph density) | 2 |

## Coverage by classification/domain

- Electrical Appliances: 4
- Automotive Components: 4
- Civil Construction: 3
- (unclassified): 3
- Food & Beverages: 2
- Electronics: 2
- Solar Energy: 2
- Precious Metals: 2
- Toys & Children Products: 2
- Consumer Electricals: 2
- Smart Metering & Power: 2
- Consumer Electronics: 2
- Plumbing & Piping: 2
- Dairy: 1
- Dairy & Nutrition: 1
- Electronics & IT: 1
- Telecommunications: 1
- Household Electronics: 1
- Household Appliances: 1
- Safety Gear: 1
- PPE: 1
- Industrial PPE: 1
- Electrical & Lighting: 1
- Electrical Infrastructure: 1
- Electrical Accessories: 1
- Management Systems: 1
- Enterprise IT: 1
- Building Materials: 1
- Wood & Timber Products: 1
- Sanitaryware & Ceramics: 1
- Kitchen & Domestic Appliances: 1
- Medical Equipment & Devices: 1

## Known gaps (stated honestly, not glossed over)

- No laboratory data collected yet (`laboratories` table does not exist).
- No committee data collected yet.
- No amendment/revision graph populated yet — all 51 standards are single, undated edition records.
- Relationship count above (50) comes entirely from `scripts/data-relationships.ts`, which materializes two edge types (STANDARD_HAS_PRODUCT_MANUAL, STANDARD_SUBJECT_TO_QCO) from existing foreign keys — it is repeatable and idempotent, but it is NOT text-based relationship extraction: no script yet reads document text to find e.g. STANDARD_REFERENCES_STANDARD or STANDARD_SUPERSEDES_STANDARD edges.
- `data/manifests/discovered-sources.json` contains candidate URLs found via sitemap crawling, all `needs_review` — none have been downloaded, confirmed, or extracted from.
