import { describe, test, expect } from "vitest";
import {
  allPolicyPages,
  getPolicyPage,
  pickVariant,
  POLICY_PAGE_KEYS,
  type PolicyLink,
  type PolicyPage,
} from "@/lib/policy-pages";

/**
 * Every host BIS itself links to from these pages — currently just its own
 * site, since all that remains are the "Website Policies" sidebar links.
 * The point of pinning the set is that a future scrape which starts pulling
 * in hosts BIS never published fails loudly.
 */
const HOSTS_BIS_PUBLISHES = ["www.bis.gov.in"];

function linksOf(page: PolicyPage): PolicyLink[] {
  return page.variants.flatMap((variant) => variant.relatedLinks);
}

describe("scraped BIS policy pages", () => {
  test("all three footer policy pages are present", () => {
    expect(allPolicyPages().map((p) => p.key)).toEqual([...POLICY_PAGE_KEYS]);
  });

  test("every page has an English variant with real content", () => {
    for (const page of allPolicyPages()) {
      const en = page.variants.find((v) => v.lang === "en");
      expect(en?.available, `${page.key} has no English text`).toBe(true);
      expect(en?.blocks.length, `${page.key} has no English content blocks`).toBeGreaterThan(0);
      expect(en?.title.trim(), `${page.key} has no title`).not.toBe("");
    }
  });

  test("every variant cites the bis.gov.in page it was copied from", () => {
    for (const page of allPolicyPages()) {
      for (const variant of page.variants) {
        const url = new URL(variant.sourceUrl);
        expect(url.hostname).toBe("www.bis.gov.in");
        expect(url.searchParams.get("lang")).toBe(variant.lang);
      }
    }
  });

  test("the retrieval date is recorded, so the copy can be dated", () => {
    for (const page of allPolicyPages()) {
      expect(page.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("every link is an absolute http(s) URL, never a relative or javascript: leftover", () => {
    const bad = allPolicyPages()
      .flatMap(linksOf)
      .filter((link) => !/^https?:\/\//.test(link.href));
    expect(bad).toEqual([]);
  });

  test("every link points at a host BIS itself publishes", () => {
    const bad = allPolicyPages()
      .flatMap(linksOf)
      .filter((link) => !HOSTS_BIS_PUBLISHES.includes(new URL(link.href).hostname));
    expect(bad).toEqual([]);
  });

  test("no link is left with an empty label", () => {
    const unlabelled = allPolicyPages()
      .flatMap(linksOf)
      .filter((link) => link.label.trim() === "");
    expect(unlabelled).toEqual([]);
  });

  test("no scraped text carries leftover markup or HTML entities", () => {
    const text = allPolicyPages()
      .flatMap((page) => page.variants)
      .flatMap((variant) => [
        variant.title,
        ...variant.relatedLinks.map((l) => l.label),
        ...variant.blocks.flatMap((block) => {
          if (block.type === "paragraph") return block.runs.map((r) => r.text);
          if (block.type === "heading") return [block.text];
          return block.items.flat().map((r) => r.text);
        }),
      ])
      .join(" ");
    expect(text).not.toMatch(/<[a-z/]/i);
    expect(text).not.toMatch(/&[a-z]+;|&#\d+;/i);
  });

  test("the policy pages are prose, not a bare list of links", () => {
    for (const key of POLICY_PAGE_KEYS) {
      const en = getPolicyPage(key)?.variants.find((v) => v.lang === "en");
      expect(en?.blocks.some((b) => b.type === "paragraph"), `${key} has no prose`).toBe(true);
    }
  });

  test("an unknown key returns null rather than a fabricated page", () => {
    // @ts-expect-error — deliberately outside PolicyPageKey
    expect(getPolicyPage("cookie-policy")).toBeNull();
  });
});

describe("language selection", () => {
  test("shows Hindi when BIS publishes it", () => {
    const page = getPolicyPage("terms-and-conditions")!;
    const { variant, isFallback } = pickVariant(page, "hi");
    expect(variant.lang).toBe("hi");
    expect(isFallback).toBe(false);
  });

  test("falls back to English, flagged as a fallback, when BIS has no translation", () => {
    // BIS answers ?lang=hi on the privacy policy with "only available in English".
    const page = getPolicyPage("privacy-policy")!;
    const { variant, isFallback, availableLangs } = pickVariant(page, "hi");
    expect(variant.lang).toBe("en");
    expect(isFallback).toBe(true);
    expect(availableLangs).toEqual(["en"]);
  });

  test("falls back to English for the UI languages BIS does not publish at all", () => {
    const page = getPolicyPage("terms-and-conditions")!;
    const { variant, isFallback } = pickVariant(page, "ta");
    expect(variant.lang).toBe("en");
    expect(isFallback).toBe(true);
  });

  test("never returns an unavailable variant", () => {
    for (const page of allPolicyPages()) {
      for (const lang of ["en", "hi", "bn", "ta", "te", "mr", "gu", "kn"] as const) {
        expect(pickVariant(page, lang).variant.available, `${page.key}/${lang}`).toBe(true);
      }
    }
  });
});
