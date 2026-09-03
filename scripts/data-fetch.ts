/**
 * Second-stage discovery (docs/DATA_ACQUISITION_PLAN.md §4). The
 * sitemap-based discovery in scripts/data-discover.ts only finds HTML
 * pages — BIS's post/page sitemap never lists the PDF assets themselves
 * (verified this session: 0 of 415 discovered URLs are direct PDF
 * links). This script fetches a small, hand-picked set of promising BIS
 * index pages and extracts their outbound PDF links, which is the
 * actual missing step between "we found a page about product manuals"
 * and "we have a PDF URL to download."
 *
 * Deliberately NOT run against all 415 discovered URLs — only a small,
 * category-chosen subset, per docs/DATA_ACQUISITION_PLAN.md's own
 * "small controlled batch" instruction. Deliberately does not download
 * or parse the PDFs themselves — that is a separate, more careful next
 * step once real links are confirmed to exist.
 *
 * Usage: npx tsx scripts/data-fetch.ts
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { politeFetch } from "./data-lib/rate-limit";

// Hand-picked from data/manifests/discovered-sources.json's own
// categories (product-manuals, product-certification, fmcs,
// laboratorys, compendium, know-your-standard) — not new guessing, and
// deliberately excludes the "products-under-compulsory-certification"
// page already confirmed JS/AJAX-rendered with no static content
// (scripts/data-discover.ts's own header comment).
const CANDIDATE_PAGES = [
  "https://www.bis.gov.in/product-certification/product-specific-information-2/product-manuals/",
  "https://www.bis.gov.in/product-certification/product-specific-information-2/product-manualsmk/",
  "https://www.bis.gov.in/product-certification/product-specific-information-2/",
  "https://www.bis.gov.in/product-manual-archive/",
  "https://www.bis.gov.in/product-manuals-copy-bkp/",
  "https://www.bis.gov.in/product-certification/product-specific-guideline/",
  "https://www.bis.gov.in/product-certification/product-specific-guidelines/",
  "https://www.bis.gov.in/product-certification/grouping-guidelines/",
  "https://www.bis.gov.in/compendium-of-indian-standards/",
  "https://www.bis.gov.in/know-your-standard/",
  "https://www.bis.gov.in/fmcs/certification-process/products-under-fmcs/",
  "https://www.bis.gov.in/laboratorys/list-of-bis-recognized-lab/",
  "https://www.bis.gov.in/laboratorys/list-of-laboratories/",
  "https://www.bis.gov.in/laboratorys/testing-facility-and-testing-charges/",
  "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/",
];

export interface DiscoveredDocument {
  pdfUrl: string;
  foundOnPage: string;
  linkText: string | null;
  state: "DISCOVERED";
  discoveredAt: string;
}

const PDF_LINK_PATTERN = /<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractPdfLinks(html: string, pageUrl: string): DiscoveredDocument[] {
  const found: DiscoveredDocument[] = [];
  for (const match of html.matchAll(PDF_LINK_PATTERN)) {
    const [, href, innerHtml] = match;
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, pageUrl).toString();
    } catch {
      continue; // malformed href — skip rather than guess
    }
    found.push({
      pdfUrl: absoluteUrl,
      foundOnPage: pageUrl,
      linkText: stripTags(innerHtml) || null,
      state: "DISCOVERED",
      discoveredAt: new Date().toISOString(),
    });
  }
  return found;
}

async function main() {
  const outPath = path.join(__dirname, "..", "data", "manifests", "discovered-documents.json");
  const existing: DiscoveredDocument[] = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : [];
  const seenUrls = new Set(existing.map((d) => d.pdfUrl));

  const results: Array<{ page: string; status: "ok" | "error"; pdfLinksFound: number; error?: string }> = [];
  const newDocs: DiscoveredDocument[] = [];

  for (const pageUrl of CANDIDATE_PAGES) {
    try {
      const res = await politeFetch(pageUrl);
      if (!res.ok) {
        results.push({ page: pageUrl, status: "error", pdfLinksFound: 0, error: `HTTP ${res.status}` });
        continue;
      }
      const html = await res.text();
      const links = extractPdfLinks(html, pageUrl);
      const fresh = links.filter((l) => !seenUrls.has(l.pdfUrl));
      for (const l of fresh) seenUrls.add(l.pdfUrl);
      newDocs.push(...fresh);
      results.push({ page: pageUrl, status: "ok", pdfLinksFound: links.length });
      console.log(`[${links.length} PDF link(s), ${fresh.length} new] ${pageUrl}`);
    } catch (err) {
      results.push({ page: pageUrl, status: "error", pdfLinksFound: 0, error: err instanceof Error ? err.message : String(err) });
      console.error(`[ERROR] ${pageUrl} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const merged = [...existing, ...newDocs];
  writeFileSync(outPath, JSON.stringify(merged, null, 2));

  console.log(`\nPages fetched: ${CANDIDATE_PAGES.length} (${results.filter((r) => r.status === "ok").length} ok, ${results.filter((r) => r.status === "error").length} failed)`);
  console.log(`New PDF links discovered this run: ${newDocs.length}`);
  console.log(`Total discovered documents on file: ${merged.length}`);
  console.log(`Written to ${outPath}`);
  console.log("\nThese are DISCOVERED, not fetched or indexed — no PDF has been downloaded, no chunk/embedding created.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
