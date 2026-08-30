import { describe, test, expect } from "vitest";
import { NAV_SECTIONS } from "@/lib/navigation";
import { getOfficialLinks, allOfficialUrls, OFFICIAL_LINKS } from "@/lib/official-links";

/** Hosts we accept: bis.gov.in and the official portals BIS itself links to. */
const OFFICIAL_HOSTS = [
  "www.bis.gov.in",
  "www.manakonline.in",
  "www.crsbis.in",
  "standardsbis.bsbedge.com",
];

/**
 * Items that intentionally have no official destination, with the reason.
 * Anything else without links is a gap, not a decision.
 */
const INTENTIONALLY_EMPTY = new Set(["standards:why-relevant"]);

function placeholderItems() {
  const out: { key: string; label: string }[] = [];
  for (const section of NAV_SECTIONS) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.real) continue;
        // An empty slug is the section's own landing page, which each section
        // owns (some are real pages); only sub-pages go through PlaceholderPage.
        if (!item.slug) continue;
        out.push({ key: `${section.key}:${item.slug}`, label: item.label });
      }
    }
  }
  return out;
}

describe("official links", () => {
  test("every placeholder nav item has verified official links", () => {
    const missing = placeholderItems()
      .filter((i) => !INTENTIONALLY_EMPTY.has(i.key))
      .filter((i) => {
        const at = i.key.indexOf(":");
        return getOfficialLinks(i.key.slice(0, at), i.key.slice(at + 1)).length === 0;
      })
      .map((i) => `${i.key} (${i.label})`);

    expect(missing).toEqual([]);
  });

  test("only links to official BIS properties", () => {
    const bad = allOfficialUrls().filter((u) => !OFFICIAL_HOSTS.includes(new URL(u).hostname));
    expect(bad).toEqual([]);
  });

  test("every bis.gov.in link requests the English page", () => {
    const missingLang = allOfficialUrls()
      .filter((u) => new URL(u).hostname === "www.bis.gov.in")
      .filter((u) => new URL(u).searchParams.get("lang") !== "en");
    expect(missingLang).toEqual([]);
  });

  test("no entry links to the same URL twice", () => {
    for (const [key, links] of Object.entries(OFFICIAL_LINKS)) {
      const hrefs = links.map((l) => l.href);
      expect(new Set(hrefs).size, `duplicate href in ${key}`).toBe(hrefs.length);
    }
  });

  test("every link has a non-empty label", () => {
    const unlabelled = Object.entries(OFFICIAL_LINKS).flatMap(([key, links]) =>
      links.filter((l) => !l.label.trim()).map(() => key),
    );
    expect(unlabelled).toEqual([]);
  });

  test("keys refer to nav items that actually exist", () => {
    const known = new Set(placeholderItems().map((i) => i.key));
    // Section landing pages are addressed with an empty slug.
    for (const section of NAV_SECTIONS) known.add(`${section.key}:`);

    const orphaned = Object.keys(OFFICIAL_LINKS).filter((k) => !known.has(k));
    expect(orphaned).toEqual([]);
  });
});
