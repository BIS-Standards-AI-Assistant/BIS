import { resolveStandardIds, type ResolvedStandardId } from "./standards-id";

/**
 * Deterministic query normalization — runs before intent extraction and
 * retrieval. No LLM call, no network access, fully unit-testable.
 *
 * Every transformation is logged in `transformations` so the pipeline
 * stays auditable (a normalized query should never silently diverge from
 * what the user actually typed without a traceable reason).
 */

export interface ExpandedTerm {
  term: string;
  expansion: string;
}

export interface NormalizedQuery {
  originalQuery: string;
  normalizedQuery: string;
  transformations: string[];
  identifiers: ResolvedStandardId[];
  expandedTerms: ExpandedTerm[];
}

// Deliberately small and unambiguous — abbreviation expansion only, never
// a product/material synonym dictionary. Expanding "cert" -> "certification"
// cannot change what product or material the user is asking about; expanding
// a product term (e.g. "cookware" -> "utensils") could, so that kind of
// expansion is explicitly out of scope here (see AGENTS.md-style principle
// in the milestone brief: "do not create an unrestricted synonym dictionary
// that can change user intent").
const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  std: "standard",
  stds: "standards",
  spec: "specification",
  specs: "specifications",
  cert: "certification",
  certs: "certifications",
  mfg: "manufacturing",
  mfr: "manufacturer",
  qty: "quantity",
  reqs: "requirements",
  req: "requirement",
  temp: "temperature",
  "w.r.t": "with respect to",
  "w.r.t.": "with respect to",
  bis: "Bureau of Indian Standards",
};

// British/American spelling variants that appear in both the corpus and
// real user queries. Unifying spelling (not meaning) is safe — it never
// changes which product/material/standard is being asked about.
const SPELLING_UNIFICATION: Record<string, string> = {
  litre: "liter",
  litres: "liters",
  colour: "color",
  colours: "colors",
  licence: "license",
  fibre: "fiber",
};

function normalizeUnicode(text: string): string {
  return text.normalize("NFKC");
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizePunctuation(text: string): string {
  return text
    .replace(/[‘’]/g, "'") // curly single quotes -> straight
    .replace(/[“”]/g, '"') // curly double quotes -> straight
    .replace(/[–—]/g, "-") // en/em dash -> hyphen
    .replace(/…/g, "..."); // ellipsis character -> three dots
}

function applyWordDictionary(
  text: string,
  dictionary: Record<string, string>,
): { text: string; expanded: ExpandedTerm[] } {
  const expanded: ExpandedTerm[] = [];
  const result = text.replace(/[A-Za-z][A-Za-z.]*/g, (word) => {
    const key = word.toLowerCase();
    const replacement = dictionary[key];
    if (!replacement || replacement.toLowerCase() === key) return word;
    expanded.push({ term: word, expansion: replacement });
    return replacement;
  });
  return { text: result, expanded };
}

export function normalizeQuery(query: string): NormalizedQuery {
  const originalQuery = query;
  const transformations: string[] = [];
  let text = query;

  const unicoded = normalizeUnicode(text);
  if (unicoded !== text) transformations.push("unicode_nfkc");
  text = unicoded;

  const punctuated = normalizePunctuation(text);
  if (punctuated !== text) transformations.push("punctuation_normalized");
  text = punctuated;

  const whitespaced = normalizeWhitespace(text);
  if (whitespaced !== text) transformations.push("whitespace_collapsed");
  text = whitespaced;

  // Identifiers are detected against the punctuation/whitespace-normalized
  // text (so "IS  5522 : 2014" and "IS 5522:2014" resolve identically) but
  // BEFORE abbreviation/spelling expansion, since expansion operates on
  // word tokens and must not be allowed to touch identifier substrings.
  const identifiers = resolveStandardIds(text);

  const spelled = applyWordDictionary(text, SPELLING_UNIFICATION);
  if (spelled.expanded.length > 0) transformations.push("spelling_unified");
  text = spelled.text;

  const abbreviated = applyWordDictionary(text, ABBREVIATION_EXPANSIONS);
  if (abbreviated.expanded.length > 0) transformations.push("abbreviations_expanded");
  text = abbreviated.text;

  const expandedTerms = [...spelled.expanded, ...abbreviated.expanded];

  return {
    originalQuery,
    normalizedQuery: text,
    transformations,
    identifiers,
    expandedTerms,
  };
}
