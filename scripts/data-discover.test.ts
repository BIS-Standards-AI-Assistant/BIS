import { describe, test, expect } from "vitest";
import { extractLocs, isRelevant } from "./data-discover";

describe("extractLocs", () => {
  test("extracts a plain <loc>url</loc>", () => {
    const xml = "<sitemap><loc>https://www.bis.gov.in/page-sitemap.xml</loc></sitemap>";
    expect(extractLocs(xml)).toEqual(["https://www.bis.gov.in/page-sitemap.xml"]);
  });

  test("extracts a CDATA-wrapped <loc>", () => {
    const xml = "<sitemap><loc><![CDATA[https://www.bis.gov.in/page-sitemap.xml]]></loc></sitemap>";
    expect(extractLocs(xml)).toEqual(["https://www.bis.gov.in/page-sitemap.xml"]);
  });

  test("does not double-match or corrupt a CDATA entry the way two separate regexes would", () => {
    const xml = "<loc><![CDATA[https://www.bis.gov.in/x]]></loc>";
    const locs = extractLocs(xml);
    expect(locs).toHaveLength(1);
    expect(locs[0]).not.toContain("CDATA");
    expect(locs[0]).not.toContain("[");
  });

  test("extracts multiple mixed plain and CDATA entries from one document", () => {
    const xml = `
      <sitemapindex>
        <sitemap><loc>https://www.bis.gov.in/post-sitemap.xml</loc></sitemap>
        <sitemap><loc><![CDATA[https://www.bis.gov.in/page-sitemap.xml]]></loc></sitemap>
      </sitemapindex>`;
    expect(extractLocs(xml)).toEqual([
      "https://www.bis.gov.in/post-sitemap.xml",
      "https://www.bis.gov.in/page-sitemap.xml",
    ]);
  });

  test("returns an empty array for XML with no <loc> tags — never fabricates a URL", () => {
    expect(extractLocs("<sitemapindex></sitemapindex>")).toEqual([]);
  });
});

describe("isRelevant", () => {
  test("accepts a URL containing a certification-related keyword", () => {
    expect(isRelevant("https://www.bis.gov.in/product-certification/products-under-compulsory-certification/")).toBe(true);
  });

  test("accepts a URL containing 'know-your-standard'", () => {
    expect(isRelevant("https://www.bis.gov.in/know-your-standard/")).toBe(true);
  });

  test("rejects a genuinely unrelated URL (careers page)", () => {
    expect(isRelevant("https://www.bis.gov.in/about-us/careers/current-vacancies/")).toBe(false);
  });

  // Documents a real, measured limitation rather than hiding it: the
  // keyword filter is a coarse substring match, so "standard" also
  // matches unrelated event pages whose slug happens to contain "World
  // Standards Day" — e.g. a regional-office photo gallery. This is why
  // every discovered entry is written with verificationStatus
  // "needs_review", never inserted as a confirmed source automatically.
  test("known over-inclusiveness: a 'World Standards Day' event page also matches, since its slug contains the word 'standards'", () => {
    expect(isRelevant("https://www.bis.gov.in/world-standards-day-2024-2/wsd-2024-celebration-at-ros-bos/wro/rjbo/")).toBe(true);
  });

  test("is case-insensitive", () => {
    expect(isRelevant("https://www.bis.gov.in/LABORATORYS/list/")).toBe(true);
  });
});
