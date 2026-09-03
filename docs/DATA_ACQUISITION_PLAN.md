# BIS Knowledge Acquisition — Audit + Plan

Written before any new fetching, per prompts (2026-09-03 "KNOWLEDGE
ACQUISITION EXPANSION" task's own instruction: audit and plan first,
then a small controlled batch, then scale.

## 1. Audit of the existing pipeline

**Ingestion (`scripts/ingest.ts`)**: manifest-driven, NOT URL-driven.
Reads `data/seed/manifest.json` (4 entries) and expects each entry's raw
text to already exist at `data/seed/raw/<file>` — there is no
download-and-extract step in this script at all. It checksums the raw
text, chunks it (`src/lib/chunk.ts`), embeds via the existing
`embedding-provider.ts`, and upserts into `documents`/`chunks`.
Idempotent (skips unchanged checksums). This is the only script that
writes to the retrieval-indexed `chunks` table.

**Discovery (`scripts/data-discover.ts`)**: fetches
`bis.gov.in/sitemap.xml`, filters to `post-sitemap.xml`/
`page-sitemap.xml`, keyword-filters URLs, writes
`data/manifests/discovered-sources.json`. **Verified this session: 0 of
the 415 discovered URLs are direct PDF links** — the BIS post/page
sitemap only indexes HTML pages (news posts, static info pages,
procurement notices), not the PDF assets that live under
`/wp-content/uploads/`. This is the actual reason the corpus has stayed
at 4 documents: the existing discovery mechanism cannot find PDFs by
itself. It needs a second stage.

**PDF parsing**: `pdf-parse` is a declared dependency (`package.json`)
but is not called anywhere in the repo yet — no script currently
extracts text from a downloaded PDF. This is a real, currently-missing
pipeline stage, not a rename of something that exists.

**Relationship materialization (`scripts/data-relationships.ts`)**: real
and idempotent, but only reads existing FK data (`documents.standardId`,
`qcos.standardId`) — it does not discover new relationships from text.

**Schema state actually queried live** (2026-09-03): 51 standards, 4
documents, 142 chunks (142/142 embedded), 46 QCOs, 50 relationships, 44
sources, 415 discovered candidate URLs (none fetched).

**Verification/provenance fields that already exist and will be reused,
not duplicated**: `documents.checksum` (sha256), `documents.sourceUrl`,
`documents.retrievedAt`, `sources.sha256`, `sources.verificationStatus`,
`standards.verificationStatus`, `qcos.verificationStatus`. No new
provenance schema is needed for a first controlled batch — the existing
fields already cover source URL, checksum, retrieval timestamp, and
verification status per prompts/final.md-family rules across this
project's history.

## 2. What's actually missing (the real gap, not a re-statement)

1. A script that extracts outbound PDF links from a BIS HTML page (the
   "second-stage discovery" the sitemap alone cannot do).
2. A script that downloads a PDF politely, checksums it, and extracts
   text via `pdf-parse`.
3. Deduplication against the corpus already ingested (by checksum and
   by `standardNumber`, both already present in the schema).

## 3. Copyright/access consideration (governs scope, not optional)

BIS Product Manuals (the category all 4 existing documents belong to)
are published free on bis.gov.in specifically for licensees and the
public — this is the category this plan targets. Full Indian Standard
texts themselves are frequently paid/restricted
(`reference-registry.ts`'s `official_purchase`/`restricted` access
types exist precisely for this). **This plan does not attempt to fetch
full IS standard texts** — only Product Manuals, QCO/certification
guideline pages, and other material BIS already publishes openly,
matching the category of the 4 documents already in the corpus.

## 4. Plan for this pass

Given the real gap above, and "execute a small controlled batch, verify
it, and scale safely" (not "download all 415"):

1. **`scripts/data-fetch.ts`** (new): given a small, hand-picked list of
   promising BIS index pages (product-manuals, product-certification,
   fmcs, laboratorys, compendium, know-your-standard — chosen from the
   415 already-discovered URLs by category, not new guessing), fetches
   each politely (reusing `scripts/data-lib/rate-limit.ts`'s
   `politeFetch`, already rate-limited to 1.5s/request with backoff),
   extracts outbound links ending in `.pdf`, and writes
   `data/manifests/discovered-documents.json` — real PDF URLs, state
   `DISCOVERED`, not yet fetched as PDFs, not yet indexed.
2. Run it live against ~15-20 index pages (not all 415).
3. Report the exact, real result: how many real PDF links were found,
   from which pages, and whether any correspond to standards not
   already in the corpus.
4. Only if real new PDF links are found for standards outside the
   existing 4: fetch 1-3 of them as a genuinely small controlled batch,
   checksum, parse with `pdf-parse`, inspect the extracted text quality
   before treating it as ingestable evidence, and only then extend
   `data/seed/manifest.json` and run the existing `scripts/ingest.ts`
   (no new ingestion architecture).
5. Report the honest before/after: documents, chunks, embedded chunks —
   never conflate "discovered a PDF URL" with "indexed knowledge."

This plan deliberately stops short of items requiring their own careful
design this pass — amendment-chain modeling (§12), document
classification taxonomy beyond a URL-heuristic first pass (§7), and the
`FETCHED`/`PARSED`/`VERIFIED`/`INDEXED`/`REJECTED` full state machine
(§4) — because building that machinery now, before a second real
document has even been found and verified, would be exactly the
"looks sophisticated, adds nothing real" failure mode this project's
other prompts have already flagged and avoided. It will be built once
there is a real batch of 10+ verified documents to actually manage
states for.

## 5. Results of the first controlled batch (executed 2026-09-03)

`scripts/data-fetch.ts` ran live against the 15 hand-picked index pages
above. Two of them — `product-manuals/` (3,417 links) and
`product-manual-archive/` (2,202 links, ~1,096 unique) — turned out to be
real second-stage discovery gold: `product-manual-archive/` in
particular is a flat list of ~1,096 unique BIS Product Manual PDFs, most
named `PM-IS-<number>...pdf`, i.e. exactly the P0-B category this plan
targets. This is a genuinely new discovery mechanism, not a re-statement
of the existing 415 sitemap URLs (0 of which are PDFs).

Cross-checked live against the database (not assumed): of 959
archive PDFs with an extractable IS number, 79 matched a `normalizedNumber`
already in the `standards` table, and of those, 21 corresponded to a
standard that currently had **zero** documents at all — i.e. would be
first-time real evidence rather than a competing/duplicate edition of a
standard that already has a document. This 21-URL set was the actual
controlled batch (`scripts/data-parse-batch.ts`), per the "10-20 URLs"
instruction — not a scaled-up guess.

**Batch outcome**: 1 URL rejected pre-fetch (a link-extraction artifact —
two concatenated URLs in one href), 20 PDFs downloaded, checksummed, and
parsed with `pdf-parse`. All 20 produced real, legible bilingual
Hindi/English text (verified by reading extracted output, not by length
alone). Comparing each PDF's *own declared* "ACCORDING TO IS ..." line
against the DB's `canonicalNumber` — not just the number, but edition
year and part — surfaced **5 real mismatches**: e.g. the DB's
`IS 2347:2017` matched the filename's IS number, but the PDF itself
states `IS 2347:2023`, a different (newer) edition. All 5 mismatches plus
the 1 malformed URL were quarantined, not ingested — see
`data/reports/review-queue.md` for the full list and reasoning. This is
the anti-fabrication/data-quality gate (this plan's §16/§22) actually
firing on real data, not a hypothetical.

The remaining **15 PDFs**, whose declared edition and part matched the
DB record exactly, were added to `data/seed/manifest.json` and run
through the existing, unmodified `scripts/ingest.ts` →
`scripts/data-migrate-existing.ts` (document→standard linking) →
`scripts/data-relationships.ts` (edge materialization) →
`scripts/data-report.ts` pipeline — no new ingestion architecture.

**Verified before/after** (live DB counts):

| Metric | Before | After |
|---|---|---|
| Documents | 4 | 19 |
| Chunks | 142 | 557 |
| Embedded chunks | 142 | 557 |
| Standards with ≥1 document | 4 | 19 (of 51) |
| Relationships | 50 | 65 |
| Standards | 51 | 51 (unchanged — 0 new rows; all 15 links matched an existing row) |
| QCOs | 46 | 46 (unchanged) |

Post-ingestion retrieval smoke test (`retrieveChunks`, live DB, 5 queries
targeting the newly-indexed standards) returned the correct standard as
the top-scored result for all 5, with no wrong-standard contamination.
`npm run test:ml` and `src/lib/retrieval.test.ts` both pass unchanged.

One pre-existing seed document (`IS 15410:2003`) failed to re-ingest on
this run with a foreign-key delete error (some other table references
`documents.id` without `onDelete: cascade`) — this is a pre-existing gap
unrelated to this batch, the document's original row and its 10 chunks
were left intact (delete failed inside a transaction), and it is not
fixed in this pass since it is a schema change outside this plan's scope.
