# BIS QCO standards dataset — verified

A corrected, source-cited version of the dataset from
[`BIS-Standards-AI-Assistant/BIS-standards-dataset`](https://github.com/BIS-Standards-AI-Assistant/BIS-standards-dataset).

## Why this exists

The upstream repo's `dataset/real_bis_standards.json` (despite its name and the
README calling it "Verified Government Gazette Standards") is a hardcoded
Python list with **no source URL, gazette reference, or retrieval date for any
of its 22 entries** — nothing to check the claims against. That's a direct
conflict with this project's own no-hallucination rule (`AGENTS.md` §4.1,
§42–43): every claim about a real IS number, title, or edition year needs a
traceable source.

## What was done

Every one of the 22 entries was checked against real sources (BIS product
manuals, `archive.org` mirrors of official BIS standards, or, failing that, a
clearly-labeled secondary source) and given a `verification_status`:

- **`verified_accurate`** (14 entries) — matches what was found, unchanged.
- **`corrected`** (8 entries) — the upstream entry had a **wrong** IS number,
  edition year, or part/section — not just outdated, actually wrong. Fixed
  here, with `verification_note` explaining exactly what was wrong.

Two errors are worth calling out specifically:
- **IS 302 (Part 2/Sec 26):2014** for induction cookers — Section 26 of that
  standard is actually **clocks**, a completely different product. The real
  induction-cooker standard is IS 302 (Part 2/Section 6):2009.
- **IS 4151:2020** for helmets — no such edition exists. The regulatory
  *order* mandating helmet certification is dated 2020, but it requires
  compliance with IS 4151:**2015** — the upstream dataset conflated the
  order's year with the standard's edition year.

Full detail — what changed and why — for every entry is in
`qco-standards.json`'s `verification_note` field.

## Honesty about source quality

Not every `source_url` here is an official `bis.gov.in` page — several are
`archive.org` mirrors of the official standard, or (where no primary source
was found this session) a certification-aggregator page, explicitly flagged
via `source_note`. Entries whose source is not a primary BIS document should
be re-verified before being treated as fully authoritative — the goal here
was to catch outright fabrications, not to guarantee every field is perfect.

## 2026-08-30 update: 26 new entries added, all `needs_review`

The upstream repo pushed a 50-entry version of
`dataset/real_bis_standards.json` (up from 22), with a richer schema
(`supersedes`, `superseded_by`, `amendments`, `legal_source` with
gazette/notification numbers). 26 of those 50 entries are for standards
not already in this file; they were appended here.

**They were NOT trusted at upstream's self-labeled `verified_accurate`
status**, and are instead marked `needs_review`. Reason: this session
spot-checked the upstream update against the two errors already
documented above (the induction-cooker Section 26/6 mixup, and the
fabricated "IS 4151:2020" edition) — **both errors are still present,
unfixed, and still self-labeled `verified_accurate`** in the 50-entry
version. Worse, `BIS-STD-001` (`IS 14543`) in the new file again claims
a "2024" edition and `supersedes: "IS 14543:2016"` — the exact same
fabrication this README already documented and corrected once (see the
`IS 14543:2016` entry's own `verification_note` above: "Source dataset
listed 'IS 14543:2024' — no such edition exists"). Upstream re-added a
previously-debunked fabrication into its own "verified" data. Its
self-verification process cannot be trusted for new entries either,
so nothing new was accepted as verified without independent checking —
which was not done this session for the 26 new entries; each carries a
`verification_note` explaining exactly this and listing upstream's own
supersession/amendment/notification claims as explicitly unverified.

Anyone (or any future session) treating these 26 as ground truth should
re-check each against a primary BIS source first — the same process
used for the original 22 (see above).

## What this is *not*

- Not wired into the app's ingestion pipeline (`scripts/ingest.ts`) or the
  Neon `documents`/`chunks` schema — this is a standalone, reviewed reference
  file. Ingesting it as real chunks with citable evidence would need each
  entry's actual clause text, not just metadata.
- Not a replacement for the upstream repo's ChromaDB pipeline — that stack
  (Python + ChromaDB) is architecturally separate from this app's Neon +
  pgvector retrieval layer, and reconciling the two is a separate decision.
