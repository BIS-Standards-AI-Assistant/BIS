import { describe, test, expect } from "vitest";
import { NAV_SECTIONS, navItemHref, findNavItem, STANDARDS_SECTION } from "@/lib/navigation";

describe("navItemHref", () => {
  test("every placeholder item's generated href resolves back to that exact item via findNavItem", () => {
    // This is the invariant that broke: MegaMenu and the mobile menu each
    // independently re-derived a nav item's URL, and neither one knew that
    // Standards' placeholder pages live at /standards/explore/* rather than
    // /standards/* (that path is taken by the real /standards/[id] detail
    // route). Every Standards placeholder link 404'd as a result. Asserting
    // the round trip for every section, not just Standards, is what stops
    // this class of bug from recurring anywhere else.
    const broken: string[] = [];

    for (const section of NAV_SECTIONS) {
      for (const group of section.groups) {
        for (const item of group.items) {
          if (item.real || !item.slug) continue;

          const href = navItemHref(section, item);
          const base = section.placeholderBasePath ?? section.rootHref;
          if (!href.startsWith(`${base}/`)) {
            broken.push(`${section.key}:${item.slug} -> ${href} (expected to start with ${base}/)`);
            continue;
          }

          const slugParts = href.slice(base.length + 1).split("/");
          const found = findNavItem(section.key, slugParts);
          if (found?.item !== item) {
            broken.push(`${section.key}:${item.slug} -> ${href} (findNavItem could not resolve it back)`);
          }
        }
      }
    }

    expect(broken).toEqual([]);
  });

  test("Standards placeholder items resolve under /standards/explore, not /standards", () => {
    const explorer = STANDARDS_SECTION.groups.flatMap((g) => g.items).find((i) => i.slug === "explorer")!;
    expect(navItemHref(STANDARDS_SECTION, explorer)).toBe("/standards/explore/explorer");
  });

  test("an item with an explicit href always wins, regardless of slug", () => {
    const browse = STANDARDS_SECTION.groups.flatMap((g) => g.items).find((i) => i.label === "Browse Standards")!;
    expect(navItemHref(STANDARDS_SECTION, browse)).toBe("/standards");
  });

  test("an empty-slug placeholder item resolves to the section root", () => {
    const overview = { slug: "", href: undefined };
    expect(navItemHref(STANDARDS_SECTION, overview)).toBe("/standards");
  });
});
