import { describe, test, expect } from "vitest";
import { NAV_SECTIONS } from "@/lib/navigation";
import { getPageFacts, allFactSourceUrls, PAGE_FACTS } from "@/lib/page-facts";

const OFFICIAL_HOSTS = ["www.bis.gov.in", "standards.bis.gov.in", "lims.bis.gov.in"];

function navKeys() {
  const keys = new Set<string>();
  for (const section of NAV_SECTIONS) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.real || !item.slug) continue;
        keys.add(`${section.key}:${item.slug}`);
      }
    }
  }
  return keys;
}

describe("page facts", () => {
  test("every facts key refers to a nav item that actually exists", () => {
    const known = navKeys();
    const orphaned = Object.keys(PAGE_FACTS).filter((k) => !known.has(k));
    expect(orphaned).toEqual([]);
  });

  test("every fact set cites an official BIS source", () => {
    const bad = allFactSourceUrls().filter((u) => !OFFICIAL_HOSTS.includes(new URL(u).hostname));
    expect(bad).toEqual([]);
  });

  test("every fact set has a retrieval date and at least two points", () => {
    for (const [key, facts] of Object.entries(PAGE_FACTS)) {
      expect(facts.retrieved, `${key} missing retrieved date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // A single bullet isn't a page's worth of content — that's the thin
      // "one link and a shrug" state this registry exists to replace.
      expect(facts.points.length, `${key} has too few points`).toBeGreaterThanOrEqual(2);
      expect(facts.source.label.trim(), `${key} missing source label`).not.toBe("");
    }
  });

  test("points are prose, not stubs", () => {
    for (const [key, facts] of Object.entries(PAGE_FACTS)) {
      for (const point of facts.points) {
        expect(point.length, `${key} has a suspiciously short point: ${point}`).toBeGreaterThan(30);
      }
    }
  });

  test("getPageFacts returns null for a page with no researched facts", () => {
    expect(getPageFacts("certification", "no-such-slug")).toBeNull();
  });

  test("every placeholder page in every section has sourced facts", () => {
    // All 81 were researched end to end. A new nav item added without facts
    // should fail here rather than quietly ship as a page that only links out
    // — that thin state is exactly what this registry exists to prevent.
    const missing = [...navKeys()]
      // why-relevant documents this app's own UI and has bespoke content
      // (RelevanceExplainer.tsx); it never renders PlaceholderPage.
      .filter((k) => k !== "standards:why-relevant")
      .filter((k) => {
        const at = k.indexOf(":");
        return getPageFacts(k.slice(0, at), k.slice(at + 1)) === null;
      });
    expect(missing).toEqual([]);
  });
});
