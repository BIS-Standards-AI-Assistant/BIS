/**
 * Phase 1 of prompts/dataAcquisition.md — discovery, not extraction.
 *
 * This is the ONE pipeline stage that touches the network this session.
 * It does not download PDFs, does not parse standard content, and does
 * not write anything into the standards/relationships tables — it only
 * finds real, official BIS URLs and records them as `needs_review`
 * candidate sources for a human (or a later, more careful script) to
 * confirm before anything is extracted from them.
 *
 * Deliberately conservative: bis.gov.in's certification-listing pages are
 * JavaScript/AJAX-rendered (verified this session — the static HTML
 * contains no actual product/standard data, just the page shell), so a
 * plain HTTP fetch + regex cannot honestly extract that content without a
 * headless browser. Rather than guess at a hidden API endpoint and risk
 * misinterpreting its response shape as verified data, this script uses
 * BIS's own sitemap.xml (genuinely static XML, confirmed via robots.txt
 * which explicitly publishes it) to discover real, official page URLs —
 * a smaller but honest result.
 *
 * Usage: npx tsx scripts/data-discover.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { politeFetch } from "./data-lib/rate-limit";

const SITEMAP_INDEX = "https://www.bis.gov.in/sitemap.xml";

// Keywords that make a discovered URL a plausible candidate for one of
// the entity types this mission cares about (§1-§21). This is a filter
// over REAL URLs already published by BIS — it doesn't invent anything,
// it just avoids saving thousands of unrelated pages (news posts, event
// photo galleries, etc. that the same sitemap also contains).
const RELEVANT_KEYWORDS = [
  "standard", "certification", "certificat", "scheme", "testing", "test",
  "laborator", "qco", "quality-control", "know-your-standard", "product-manual",
  "hallmark", "licence", "license", "committee", "amendment", "gazette",
];

interface DiscoveredSource {
  url: string;
  domain: string;
  documentType: "candidate_page";
  discoveredVia: string;
  verificationStatus: "needs_review";
}

export function isRelevant(url: string): boolean {
  const lower = url.toLowerCase();
  return RELEVANT_KEYWORDS.some((kw) => lower.includes(kw));
}

export function extractLocs(xml: string): string[] {
  // Either <loc>url</loc> or <loc><![CDATA[url]]></loc> — never both patterns
  // against the same text, which would double-match (and mis-capture) a
  // CDATA-wrapped entry.
  const matches = [...xml.matchAll(/<loc>(?:<!\[CDATA\[(.*?)\]\]>|([^<]*))<\/loc>/g)];
  return matches.map((m) => m[1] ?? m[2]).filter(Boolean);
}

async function main() {
  console.log(`Fetching sitemap index: ${SITEMAP_INDEX}`);
  const indexRes = await politeFetch(SITEMAP_INDEX);
  const indexXml = await indexRes.text();
  const subSitemaps = extractLocs(indexXml).filter((u) => u.includes("page-sitemap") || u.includes("post-sitemap"));

  console.log(`Found ${subSitemaps.length} relevant sub-sitemap(s): ${subSitemaps.join(", ")}`);

  const discovered: DiscoveredSource[] = [];
  const seen = new Set<string>();

  for (const sitemapUrl of subSitemaps) {
    console.log(`Fetching ${sitemapUrl}...`);
    let xml: string;
    try {
      const res = await politeFetch(sitemapUrl);
      xml = await res.text();
    } catch (err) {
      console.error(`  failed: ${err instanceof Error ? err.message : String(err)} — skipping, not fabricating a result for this sitemap`);
      continue;
    }
    const urls = extractLocs(xml);
    console.log(`  ${urls.length} URL(s) in this sitemap`);

    for (const url of urls) {
      if (seen.has(url)) continue;
      if (!isRelevant(url)) continue;
      seen.add(url);
      let domain: string;
      try {
        domain = new URL(url).hostname;
      } catch {
        continue;
      }
      discovered.push({
        url,
        domain,
        documentType: "candidate_page",
        discoveredVia: sitemapUrl,
        verificationStatus: "needs_review",
      });
    }
  }

  console.log(`\n${discovered.length} relevant candidate source(s) discovered.`);

  const outDir = path.join(__dirname, "..", "data", "manifests");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "discovered-sources.json");
  writeFileSync(outPath, JSON.stringify(discovered, null, 2) + "\n");
  console.log(`Written to ${outPath}`);
  console.log(
    "\nThese are candidate URLs only — verificationStatus is 'needs_review' for every entry. " +
      "None of this has been inserted into the `sources` table or used to create any relationship. " +
      "Confirming and extracting from these is Phase 2+ work (scripts/data-download.ts, not yet built).",
  );
}

// Only run when executed directly (`tsx scripts/data-discover.ts`) — not
// when imported by scripts/data-discover.test.ts, which needs the pure
// helper functions above without triggering a live network crawl.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
