# Data Quality Review Queue

Generated manually 2026-09-03 during the first controlled ingestion batch
(`docs/DATA_ACQUISITION_PLAN.md`). These items were downloaded and parsed
successfully but were **not** ingested — each failed a specific,
documented check. None of these were forced through. Full detail (raw
extracted "according to IS ..." line vs. the DB's `canonicalNumber`) is
in the batch commit history / this file.

## Standard-number / edition mismatch (5)

The downloaded PDF is a real, legible BIS Product Manual, but the edition
or part it declares does not match the `standards` row its filename
implied. Ingesting these under the existing DB record would have silently
attached the wrong edition's requirements to a different standard —
exactly the "documents whose claimed standard number doesn't match
content" case the acquisition plan's data-quality gates exist to catch.

| Candidate URL | DB record (existing) | PDF actually declares | Resolution |
|---|---|---|---|
| PM-IS-14697-1999-era filename | IS 14697:1999 | IS 14697:2021 | Quarantined — needs a new/updated `standards` row for the 2021 edition before this PM can be ingested; not created automatically. |
| PM_IS_2556Part3 filename | IS 2556 (Part 2):2004 | IS 2556 (Part 3):2004 | Quarantined — wrong part number, do not attach to Part 2's record. |
| PM-IS-2347 filename | IS 2347:2017 | IS 2347:2023 | Quarantined — DB has the 2017 edition; this PM is for the 2023 revision. |
| PM-1165 filename | IS 1165:2022 | IS 1165:2002 | Quarantined — DB's edition year (2022) does not match the PM's declared edition (2002); needs manual verification before either is treated as current. |
| PM-302-2-7 filename | IS 302 (Part 2/Sec 201):2008 | IS 302-2-7:2024 | Quarantined — different part/section numbering scheme and a 16-year edition gap; needs manual reconciliation, not an automatic match. |

## Malformed URL (1)

| Candidate | Issue |
|---|---|
| `.../PM-IS-15633-Fourth-revision.pdf` (IS 15633:2005) | The discovered URL string contained two concatenated `https://` occurrences — a link-extraction artifact, not a real URL. Rejected before any fetch was attempted. The underlying page should be re-crawled with a fix to `scripts/data-fetch.ts`'s link extraction before retrying this one. |

## What this queue means

None of the 6 items above added anything to `documents`, `chunks`, or
`standards`. They exist only in `data/reports/batch-parse-report.json`
(full parse detail) and this file. Re-attempting them requires either (a)
a human decision on which edition is authoritative, or (b) a fixed
extraction regex for the malformed-URL case — not a re-run of the same
automatic matching logic.
