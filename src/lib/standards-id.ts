export interface ResolvedStandardId {
  /** Normalized canonical form, e.g. "IS 302 (Part 2/Sec 6):2009" */
  normalized: string;
  number: string;
  part: string | null;
  section: string | null;
  year: string | null;
  /** The exact substring matched in the original text */
  raw: string;
}

// Handles: "IS 5522:2014", "IS 5522", "5522:2014", "Indian Standard 5522",
// "IS 14756 Part 1", "IS 302 (Part 2/Sec 6):2009", "IS 302-2-6:2009",
// "IS 16333 (Part 3):2022".
const PATTERN =
  /\b(?:IS|Indian Standard)?\s*(\d{2,6})\s*(?:\(?\s*Part\s*[-/]?\s*(\d+)\s*(?:\/\s*Sec(?:tion)?\s*[-/]?\s*(\d+))?\s*\)?)?(?:[-–]\s*(\d+)[-–](\d+))?\s*:?\s*(\d{4})?\b/gi;

/**
 * Recognizes Indian Standard identifiers embedded in free text and
 * normalizes their various written forms into one canonical shape.
 * Deterministic and regex-based — no LLM call, so it works even when the
 * AI Gateway is unavailable, and it never fabricates a part/section/year
 * that wasn't actually present in the text.
 */
export function resolveStandardIds(text: string): ResolvedStandardId[] {
  const results: ResolvedStandardId[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(PATTERN)) {
    const [raw, number, part, section, dashPart, dashSection, year] = match;
    if (!number) continue;
    // Guard against matching bare years or unrelated numbers picked up by
    // an over-eager pattern: require either an explicit "IS"/"Indian
    // Standard" prefix, a part/section, or a year to call it a real hit.
    const hasContext = /\b(IS|Indian Standard)\b/i.test(raw) || part || dashPart || year;
    if (!hasContext) continue;

    const resolvedPart = part ?? dashPart ?? null;
    const resolvedSection = section ?? dashSection ?? null;

    let normalized = `IS ${number}`;
    if (resolvedPart) {
      normalized += resolvedSection ? ` (Part ${resolvedPart}/Sec ${resolvedSection})` : ` (Part ${resolvedPart})`;
    }
    if (year) normalized += `:${year}`;

    if (seen.has(normalized)) continue;
    seen.add(normalized);

    results.push({
      normalized,
      number,
      part: resolvedPart,
      section: resolvedSection,
      year: year ?? null,
      raw: raw.trim(),
    });
  }

  return results;
}

/**
 * True if `candidate` (a standard_number value from the documents table,
 * e.g. "IS 5522:2014") matches `resolved` on number and, where present,
 * part/section/year — used to boost exact-identifier hits in retrieval
 * ranking (AGENTS.md-style domain retrieval, not fuzzy embedding-only
 * matching).
 */
export function matchesResolvedId(candidate: string | null, resolved: ResolvedStandardId): boolean {
  if (!candidate) return false;
  const numberOk = new RegExp(`\\b${resolved.number}\\b`).test(candidate);
  if (!numberOk) return false;
  if (resolved.part && !new RegExp(`Part\\s*${resolved.part}\\b`, "i").test(candidate)) return false;
  if (resolved.section && !new RegExp(`Sec(?:tion)?\\s*${resolved.section}\\b`, "i").test(candidate)) return false;
  if (resolved.year && !candidate.includes(resolved.year)) return false;
  return true;
}
