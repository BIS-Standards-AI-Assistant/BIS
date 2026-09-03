/**
 * The three BIS website-policy pages — Privacy Policy, Terms & Conditions
 * and Accessibility Statement — reproduced from bis.gov.in so the footer
 * links stay inside this app instead of bouncing the user to another site.
 *
 * The content is not authored here and must not be edited here. It is
 * scraped verbatim by `npm run data:policy-pages`
 * (scripts/scrape-bis-policy-pages.ts) into data/bis-policy-pages.json;
 * re-run that script to refresh it. Every page carries the source URL and
 * the date it was read, and the renderer shows both, because this is
 * BIS's text and not ours.
 *
 * Imported statically rather than read with fs at request time: the
 * content is fixed at build time, and `output: "standalone"`
 * (next.config.ts) ships only the traced bundle — a runtime read of data/
 * would not find the file in the Docker image, which copies
 * .next/standalone and public/ but not data/.
 */
import policyPagesJson from "../../data/bis-policy-pages.json";
import type { LangCode } from "@/lib/i18n";

/** A run of text inside a paragraph or list item, optionally a link. */
export interface PolicyInline {
  text: string;
  href?: string;
}

export interface PolicyLink {
  label: string;
  href: string;
}

export type PolicyBlock =
  | { type: "paragraph"; runs: PolicyInline[] }
  | { type: "heading"; text: string }
  | { type: "list"; items: PolicyInline[][] };

/** The languages BIS publishes these particular pages in. */
export const POLICY_LANGS = ["en", "hi"] as const;
export type PolicyLang = (typeof POLICY_LANGS)[number];

export const POLICY_LANG_NAMES: Record<PolicyLang, string> = { en: "English", hi: "Hindi" };

export interface PolicyVariant {
  lang: PolicyLang;
  sourceUrl: string;
  /** false when BIS publishes no translation for this language. */
  available: boolean;
  /** The page's own heading, exactly as BIS publishes it. */
  title: string;
  /** BIS's own "Last Updated on ..." line, when the page carries one. */
  lastUpdatedOnSource: string | null;
  blocks: PolicyBlock[];
  /** The "Website Policies" side menu BIS shows beside some of these pages. */
  relatedLinks: PolicyLink[];
}

export interface PolicyPage {
  key: PolicyPageKey;
  route: string;
  variants: PolicyVariant[];
  /** ISO date the source pages were last read by the scraper. */
  retrieved: string;
}

export const POLICY_PAGE_KEYS = ["privacy-policy", "terms-and-conditions", "accessibility-statement"] as const;

export type PolicyPageKey = (typeof POLICY_PAGE_KEYS)[number];

const PAGES: Record<string, PolicyPage> = Object.fromEntries(
  policyPagesJson.pages.map((page) => [
    page.key,
    { ...(page as unknown as Omit<PolicyPage, "retrieved">), retrieved: policyPagesJson.retrieved },
  ]),
);

/**
 * Returns the scraped page, or null if the scrape has never run for that
 * key. Callers render a "not available" state rather than inventing policy
 * text — the same rule the rest of the app follows for evidence.
 */
export function getPolicyPage(key: PolicyPageKey): PolicyPage | null {
  return PAGES[key] ?? null;
}

export function allPolicyPages(): PolicyPage[] {
  return POLICY_PAGE_KEYS.map((key) => PAGES[key]).filter((page): page is PolicyPage => Boolean(page));
}

export interface PickedVariant {
  variant: PolicyVariant;
  /** true when the reader's language isn't one BIS published this page in. */
  isFallback: boolean;
  /** Languages BIS actually publishes this page in, for an honest fallback note. */
  availableLangs: PolicyLang[];
}

/**
 * Chooses which language of BIS's text to show.
 *
 * This app's UI runs in eight languages; BIS publishes these four pages in
 * at most two. Rather than machine-translate legal and policy text — which
 * would stop being BIS's published wording — an unpublished language falls
 * back to English and the page says so.
 */
export function pickVariant(page: PolicyPage, lang: LangCode): PickedVariant {
  const availableLangs = page.variants.filter((v) => v.available).map((v) => v.lang);
  const requested = page.variants.find((v) => v.lang === lang && v.available);
  const english = page.variants.find((v) => v.lang === "en" && v.available);
  const variant = requested ?? english ?? page.variants[0];
  return { variant, isFallback: variant.lang !== lang, availableLangs };
}
