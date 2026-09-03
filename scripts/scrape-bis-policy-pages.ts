/**
 * Scrapes the three BIS website-policy pages that the footer used to link
 * out to — Privacy Policy, Terms & Conditions and Accessibility Statement
 * — so the app can render the *same* text in its own shell instead of
 * throwing the user onto www.bis.gov.in.
 *
 * This copies published content verbatim; it does not summarise, reword
 * or extend it. Everything the renderer needs to attribute the text
 * (source URL, the date it was read, and BIS's own "Last Updated" line
 * where the page carries one) is written into the output alongside it,
 * because these pages are reproduced, not authored here.
 *
 * bis.gov.in is a WordPress site whose page body lives in a single
 * `div.who_we_area` column inside `section.about_us_area`; everything
 * above it is the site-wide mega menu (~195 KB of it) and everything
 * below is the site footer. The parsing here is deliberately anchored on
 * that container rather than on a generic "biggest text block"
 * heuristic, so a layout change fails loudly instead of silently
 * scraping the navigation.
 *
 * Only ?lang=en is fetched: BIS itself serves "Leider ist der Eintrag nur
 * auf English verfügbar" for ?lang=hi on these four pages, so there is no
 * translated source text to mirror.
 *
 *   npx tsx scripts/scrape-bis-policy-pages.ts
 *
 * Writes data/bis-policy-pages.json. Exits non-zero if any page yields no
 * content, so a silent scrape failure can't quietly empty the pages.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { politeFetch } from "./data-lib/rate-limit";

const OUT_PATH = path.join(process.cwd(), "data/bis-policy-pages.json");

interface Source {
  key: string;
  /** BIS's own slug; both language variants hang off it. */
  slug: string;
  /** Route this page is served at inside this app. */
  route: string;
}

const SOURCES: Source[] = [
  { key: "privacy-policy", slug: "privacy-policy", route: "/privacy-policy" },
  { key: "terms-and-conditions", slug: "terms-and-conditions", route: "/terms-and-conditions" },
  { key: "accessibility-statement", slug: "accessibility-statement", route: "/accessibility-statement" },
];

/**
 * BIS serves these pages through qTranslate. Hindi exists for two of the
 * three; for the rest it answers with an "only available in English" notice,
 * which is recorded as `available: false` rather than silently mirroring the
 * English text under a Hindi label.
 */
const LANGS = ["en", "hi"] as const;
type Lang = (typeof LANGS)[number];

const urlFor = (slug: string, lang: Lang) => `https://www.bis.gov.in/${slug}/?lang=${lang}`;

// ---------------------------------------------------------------- model

/** A run of text inside a paragraph or list item, optionally a link. */
export interface Inline {
  text: string;
  href?: string;
}

export interface LinkItem {
  label: string;
  href: string;
}

export type PolicyBlock =
  | { type: "paragraph"; runs: Inline[] }
  | { type: "heading"; text: string }
  | { type: "list"; items: Inline[][] };

export interface PolicyVariant {
  lang: Lang;
  sourceUrl: string;
  /** false when BIS publishes no translation for this language. */
  available: boolean;
  /** The page's own <h1>/<h2>, exactly as BIS publishes it. */
  title: string;
  /** BIS's own "Last Updated on ..." line, when the page carries one. */
  lastUpdatedOnSource: string | null;
  blocks: PolicyBlock[];
  /** The "Website Policies" side menu BIS shows beside some of these pages. */
  relatedLinks: LinkItem[];
}

export interface PolicyPage {
  key: string;
  route: string;
  variants: PolicyVariant[];
}

// ------------------------------------------------------------- html utils

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  copy: "©",
  reg: "®",
  deg: "°",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripTags(html: string): string {
  return collapse(decodeEntities(html.replace(/<[^>]+>/g, " ")));
}

/**
 * Returns the source of the `tagName` element starting at `startIndex`,
 * matched by counting nested tags of the same name. Needed because the
 * content column is a div among ~200 KB of other divs, and a non-greedy
 * regex would stop at the first inner </div>.
 */
function sliceBalanced(html: string, startIndex: number, tagName: string): string {
  let depth = 0;
  const tag = new RegExp(`<(/?)${tagName}\\b`, "gi");
  tag.lastIndex = startIndex;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(html)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) {
      const close = html.indexOf(">", match.index);
      return html.slice(startIndex, close === -1 ? match.index : close + 1);
    }
  }
  throw new Error(`unbalanced <${tagName}> while slicing BIS page content`);
}

function removeNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    // Icon glyphs (<i class="fa ...">) carry no text; dropping them keeps
    // "Overview" from being scraped as " Overview".
    .replace(/<i\b[^>]*>\s*<\/i>/gi, "");
}

function absolutize(href: string, base: string): string {
  try {
    return new URL(decodeEntities(href.trim()), base).toString();
  } catch {
    return href.trim();
  }
}

/** Splits an HTML fragment into plain-text and anchor runs, in order. */
export function parseInlines(html: string, base: string): Inline[] {
  const runs: Inline[] = [];
  const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;
  const pushText = (raw: string) => {
    const text = stripTags(raw);
    if (text) runs.push({ text });
  };
  while ((match = anchor.exec(html)) !== null) {
    pushText(html.slice(cursor, match.index));
    const hrefMatch = /href\s*=\s*["']([^"']*)["']/i.exec(match[1]);
    const label = stripTags(match[2]);
    if (label) {
      if (hrefMatch && hrefMatch[1].trim() && !/^javascript:/i.test(hrefMatch[1].trim())) {
        runs.push({ text: label, href: absolutize(hrefMatch[1], base) });
      } else {
        runs.push({ text: label });
      }
    }
    cursor = match.index + match[0].length;
  }
  pushText(html.slice(cursor));
  return runs;
}

// ------------------------------------------------------------- extraction

const CONTENT_COLUMN = /<div\s+class="who_we_area\s+col-md-\d+\s+col-sm-\d+"\s*>/i;

export function contentColumnOf(html: string): string {
  const match = CONTENT_COLUMN.exec(html);
  if (!match) throw new Error("content column (div.who_we_area) not found — BIS page layout changed");
  return removeNoise(sliceBalanced(html, match.index, "div"));
}

export function titleOf(column: string): string {
  const heading = /<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i.exec(column);
  if (!heading) throw new Error("page heading (<h1>/<h2>) not found in content column");
  return stripTags(heading[1]);
}

export function lastUpdatedOf(column: string): string | null {
  const note = /<p[^>]*class="[^"]*post-modified-info[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(column);
  if (!note) return null;
  return stripTags(note[1]).replace(/^Last Updated on\s*/i, "") || null;
}

/**
 * Strips the parts of the column that are chrome rather than content: the
 * breadcrumb trail (this app draws its own) and the heading block, which is
 * captured separately as the title.
 */
export function bodyOf(column: string): string {
  let body = column;
  const breadcrumb = /<div[^>]*class="fbc fbc-page"/i.exec(body);
  if (breadcrumb) {
    const slice = sliceBalanced(body, breadcrumb.index, "div");
    body = body.replace(slice, "");
  }
  const subtitle = /<div[^>]*class="subtittle"/i.exec(body);
  if (subtitle) {
    const slice = sliceBalanced(body, subtitle.index, "div");
    body = body.replace(slice, "");
  }
  return body.replace(/<p[^>]*class="[^"]*post-modified-info[^"]*"[^>]*>[\s\S]*?<\/p>/i, "");
}

/** Prose layout: paragraphs, sub-headings and lists, in document order. */
export function parseProse(body: string, base: string): PolicyBlock[] {
  const blocks: PolicyBlock[] = [];
  const element = /<(p|h3|h4|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = element.exec(body)) !== null) {
    const [, tag, inner] = match;
    if (tag === "p") {
      const runs = parseInlines(inner, base);
      // BIS uses <p>&nbsp;</p> as a spacer between paragraphs.
      if (runs.length > 0) blocks.push({ type: "paragraph", runs });
    } else if (tag === "h3" || tag === "h4") {
      const text = stripTags(inner);
      if (text) blocks.push({ type: "heading", text });
    } else {
      const items: Inline[][] = [];
      const item = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = item.exec(inner)) !== null) {
        const runs = parseInlines(li[1], base);
        if (runs.length > 0) items.push(runs);
      }
      if (items.length > 0) blocks.push({ type: "list", items });
    }
  }
  return blocks;
}

/**
 * The "Website Policies" accordion BIS renders in the left column beside
 * the policy pages. It sits outside the content column, so it is read from
 * the full page rather than from the extracted body.
 */
export function parseRelatedLinks(html: string, base: string): LinkItem[] {
  const cleaned = removeNoise(html);
  const start = /<ul\s+class="accordion-menu"\s*>/i.exec(cleaned);
  if (!start) return [];
  const slice = sliceBalanced(cleaned, start.index, "ul");
  const seen = new Set<string>();
  const links: LinkItem[] = [];
  for (const run of parseInlines(slice, base)) {
    if (run.href && !seen.has(run.href)) {
      seen.add(run.href);
      links.push({ label: run.text, href: run.href });
    }
  }
  return links;
}

/**
 * qTranslate's stand-in for an untranslated page: "Leider ist der Eintrag
 * nur auf English verfügbar." Matching the wrapper class rather than the
 * message text keeps this working whatever language the notice is in.
 */
const UNTRANSLATED = /qtranxs-available-languages-message/i;

async function scrapeVariant(source: Source, lang: Lang): Promise<PolicyVariant> {
  const sourceUrl = urlFor(source.slug, lang);
  const res = await politeFetch(sourceUrl);
  if (!res.ok) throw new Error(`${sourceUrl}: HTTP ${res.status}`);
  const html = await res.text();

  const column = contentColumnOf(html);
  const title = titleOf(column);
  const body = bodyOf(column);

  if (UNTRANSLATED.test(body)) {
    return { lang, sourceUrl, available: false, title, lastUpdatedOnSource: null, blocks: [], relatedLinks: [] };
  }

  return {
    lang,
    sourceUrl,
    available: true,
    title,
    lastUpdatedOnSource: lastUpdatedOf(column),
    blocks: parseProse(body, sourceUrl),
    relatedLinks: parseRelatedLinks(html, sourceUrl),
  };
}

async function scrape(source: Source): Promise<PolicyPage> {
  const variants: PolicyVariant[] = [];
  for (const lang of LANGS) {
    variants.push(await scrapeVariant(source, lang));
  }
  return { key: source.key, route: source.route, variants };
}

function describe(variant: PolicyVariant): string {
  if (!variant.available) return "not published in this language";
  const counts = variant.blocks.reduce<Record<string, number>>((acc, b) => {
    acc[b.type] = (acc[b.type] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([type, n]) => `${n} ${type}`)
    .join(", ") || "nothing";
}

async function main() {
  const pages: PolicyPage[] = [];
  const failures: string[] = [];

  for (const source of SOURCES) {
    try {
      const page = await scrape(source);
      const english = page.variants.find((v) => v.lang === "en");
      // English is the reference text; a page with nothing in it means the
      // scrape failed, and shipping an empty policy page is worse than failing.
      if (!english?.available || english.blocks.length === 0) {
        failures.push(`${source.key}: English variant parsed 0 content blocks`);
        continue;
      }
      pages.push(page);
      for (const variant of page.variants) {
        console.log(`  ok  ${`${source.key} [${variant.lang}]`.padEnd(31)} "${variant.title}" — ${describe(variant)}`);
      }
    } catch (err) {
      failures.push(`${source.key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const failure of failures) console.error(`  FAIL ${failure}`);

  if (pages.length > 0) {
    const output = {
      retrieved: new Date().toISOString().slice(0, 10),
      note:
        "Verbatim content of the BIS website-policy pages, scraped by scripts/scrape-bis-policy-pages.ts. " +
        "Published by the Bureau of Indian Standards at bis.gov.in; reproduced here unchanged. Do not hand-edit.",
      pages,
    };
    writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
    console.log(`\nWrote ${pages.length} page(s) to ${path.relative(process.cwd(), OUT_PATH)}`);
  }

  if (failures.length > 0) process.exit(1);
}

// Only run when executed directly (`tsx scripts/scrape-bis-policy-pages.ts`)
// — not when imported by scripts/scrape-bis-policy-pages.test.ts, which
// exercises the pure parsing helpers without hitting the network.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
