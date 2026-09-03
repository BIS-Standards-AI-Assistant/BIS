/**
 * Real, live-verified queries against the actual database — not guessed.
 * Every entry here was run against the live dev server + real Neon DB
 * during this session (P0/P1/pfinal.md work) and its behavior confirmed.
 * Re-verify if the underlying corpus changes (see docs/DATA_ACQUISITION_PLAN.md).
 */

export const KNOWN_QUERIES = {
  /** Live-verified: top result IS 15410:2003 (plastics bottle) flagged MATERIAL_MISMATCH; other results (IS 14543:2016, IS 13428:2005) DIRECTLY_APPLICABLE. */
  materialMismatch: "steel bottle",
  // 2026-09-03: was "protective helmets" (IS 4151:2015), but an upstream
  // reshape of data/bis-standards-dataset/qco-standards.json now only has
  // a certification-scheme entry for IS 4151:2020 — a different edition
  // than the one actually ingested/indexed (IS 4151:2015). The engine
  // correctly refuses to match across editions (P0's own anti-fabrication
  // rule), so certification.available correctly became false — this was
  // a real, honest data-drift discovery, not a code bug, and the fix is
  // this fixture, not the matching logic. Cement (IS 269:2015) still has
  // matching editions on both sides — live-verified.
  /** Live-verified: real testing/certification data reachable — Scheme-I (ISI), route "Scheme-I ISI Mark (Mandatory DPIIT QCO)", testing params include compressive-strength/setting-time/soundness/fineness. */
  helmetTestingAndCertification: "what tests are required for ordinary portland cement",
  helmetCertification: "how do I get BIS certification for ordinary portland cement",
  /** Live-verified: exact identifier query, resolves to a real indexed standard. */
  exactStandard: "IS 14543:2016",
  /** A standard number that resolves via the identifier parser but has no ingested document — live-verified to produce knowledgeBoundary.state "NOT_IN_DATABASE", answerable: false. */
  unindexedStandard: "IS 700:2020 requirements",
  /** Deliberately not a product/standard/BIS query — live-verified to set isRelevant: false. */
  outOfDomain: "what's the weather today",
  /** Live-verified via /api/v1/chat: classifies as wider_search, explicitly leaves the current-results scope. */
  chatWiderSearch: "Find other standards.",
  chatWhyRelevant: "Why did the first result appear?",
  chatShowEvidence: "Show me the evidence.",
  chatMissingInfo: "What information is missing?",
} as const;

/** Real standard numbers confirmed indexed with real evidence this session (data-parse-batch.ts batch + pre-existing seed). */
export const KNOWN_INDEXED_STANDARDS = [
  "IS 15410:2003",
  "IS 14543:2016",
  "IS 13428:2005",
  "IS 4151:2015",
  "IS 15757:2022",
] as const;

/** Confirmed NOT a real standard in this database — used for "fabricated identifier" tests. Must never resolve to a real match. */
export const FABRICATED_STANDARD = "IS 99999:2099";

/** A location string for Laboratory Finder tests — the specific string doesn't matter since the feature is blocked regardless (no lab dataset exists), but it must be non-empty to pass request validation. */
export const LAB_SEARCH_LOCATION = "Delhi";
