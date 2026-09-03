import { describe, test, expect } from "vitest";
import {
  bodyOf,
  contentColumnOf,
  lastUpdatedOf,
  parseInlines,
  parseProse,
  parseRelatedLinks,
  titleOf,
} from "./scrape-bis-policy-pages";

const BASE = "https://www.bis.gov.in/privacy-policy/?lang=en";

/**
 * Shaped like the real thing: the content column sits inside a page whose
 * navigation is far larger than its content and reuses the same tags, which
 * is exactly what a naive non-greedy regex gets wrong.
 */
function bisPage(inner: string, sidebar = "") {
  return `<html><body>
<div id="cssmenu"><ul class="mkmenu"><li><a href="https://www.bis.gov.in">Home</a></li></ul></div>
<section class="about_us_area row"><div class="container"><div class="row about_row">
<div class="col-md-4 col-sm-6 about_client about_pages_client">${sidebar}</div>
<div class="who_we_area col-md-8 col-sm-6">
<div style="margin-bottom:20px;"><div class="fbc fbc-page"><div class="fbc-wrap">
<ol class="fbc-items"><li><a href="https://www.bis.gov.in">Home</a></li><li class="active"><span>Privacy Policy</span></li></ol>
</div></div></div>
<div class="subtittle"><h1>Privacy Policy</h1><br/></div>
${inner}
</div>
</div></div></section>
<footer class="footer_area"><div class="container"><p>site footer</p></div></footer>
</body></html>`;
}

describe("content column extraction", () => {
  test("takes the whole content column, not the first inner </div>", () => {
    const column = contentColumnOf(bisPage("<p>First.</p><div><p>Nested.</p></div><p>Last.</p>"));
    expect(column).toContain("First.");
    expect(column).toContain("Nested.");
    expect(column).toContain("Last.");
  });

  test("does not swallow the site navigation or footer", () => {
    const column = contentColumnOf(bisPage("<p>Body.</p>"));
    expect(column).not.toContain("mkmenu");
    expect(column).not.toContain("site footer");
  });

  test("throws rather than silently returning nothing when the layout changes", () => {
    expect(() => contentColumnOf("<html><body><p>redesigned</p></body></html>")).toThrow(/layout changed/i);
  });

  test("reads the page's own heading", () => {
    expect(titleOf(contentColumnOf(bisPage("<p>Body.</p>")))).toBe("Privacy Policy");
  });

  test("decodes entities in the heading the way BIS encodes them", () => {
    const column = contentColumnOf(bisPage("<p>Body.</p>")).replace("<h1>Privacy Policy</h1>", "<h1>Terms &#038; Conditions</h1>");
    expect(titleOf(column)).toBe("Terms & Conditions");
  });

  test("strips the breadcrumb and heading from the body, keeping the prose", () => {
    const body = bodyOf(contentColumnOf(bisPage("<p>Actual policy text.</p>")));
    expect(body).toContain("Actual policy text.");
    expect(body).not.toContain("fbc-items");
    expect(body).not.toContain("<h1>");
  });
});

describe("last updated", () => {
  test("reads BIS's own last-updated line without its label", () => {
    const column = contentColumnOf(bisPage('<p class="post-modified-info">Last Updated on January 20, 2021 </p>'));
    expect(lastUpdatedOf(column)).toBe("January 20, 2021");
  });

  test("is null when the page states no date, rather than inventing one", () => {
    expect(lastUpdatedOf(contentColumnOf(bisPage("<p>No date here.</p>")))).toBeNull();
  });

  test("the last-updated line is not also scraped as a paragraph of policy text", () => {
    const body = bodyOf(contentColumnOf(bisPage('<p>Policy.</p><p class="post-modified-info">Last Updated on January 20, 2021 </p>')));
    const blocks = parseProse(body, BASE);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "paragraph", runs: [{ text: "Policy." }] });
  });
});

describe("prose parsing", () => {
  test("keeps paragraphs in document order", () => {
    const blocks = parseProse("<p>One.</p><p>Two.</p><p>Three.</p>", BASE);
    expect(blocks.map((b) => (b.type === "paragraph" ? b.runs[0].text : null))).toEqual(["One.", "Two.", "Three."]);
  });

  test("drops the &nbsp; spacer paragraphs BIS puts between paragraphs", () => {
    expect(parseProse("<p>Real.</p><p>&nbsp;</p><p>Also real.</p>", BASE)).toHaveLength(2);
  });

  test("preserves inline links with absolute URLs", () => {
    const blocks = parseProse('<p>See the <a href="/disclaimer/?lang=en">disclaimer</a> too.</p>', BASE);
    expect(blocks[0]).toEqual({
      type: "paragraph",
      runs: [
        { text: "See the" },
        { text: "disclaimer", href: "https://www.bis.gov.in/disclaimer/?lang=en" },
        { text: "too." },
      ],
    });
  });

  test("keeps a javascript: anchor as plain text rather than an unusable link", () => {
    const blocks = parseProse('<p>A <a href="javascript:void(0);">toggle</a> here.</p>', BASE);
    const runs = blocks[0].type === "paragraph" ? blocks[0].runs : [];
    expect(runs.every((r) => r.href === undefined)).toBe(true);
  });

  test("parses lists and headings", () => {
    const blocks = parseProse("<h3>Section</h3><ul><li>First</li><li>Second</li></ul>", BASE);
    expect(blocks[0]).toEqual({ type: "heading", text: "Section" });
    expect(blocks[1]).toEqual({ type: "list", items: [[{ text: "First" }], [{ text: "Second" }]] });
  });
});

describe("related website-policy links", () => {
  const sidebar = `<ul class="accordion-menu">
<li><div class="dropdownlink"><i class="fa fa-globe"></i><a href="/website-policies/?lang=en"> Website Policies</a></div>
<ul class="submenuItems">
  <li><div class="dropdownlink"><a href="/copyright-policy/?lang=en">Copyright Policy</a></div></li>
  <li><div class="dropdownlink"><a href="/copyright-policy/?lang=en">Copyright Policy</a></div></li>
</ul></li>
<li><div class="dropdownlink"><a href="/disclaimer/?lang=en">Disclaimer</a></div></li>
</ul>`;

  test("collects the whole accordion, not just its first entry", () => {
    const links = parseRelatedLinks(bisPage("<p>Body.</p>", sidebar), BASE);
    expect(links.map((l) => l.label)).toEqual(["Website Policies", "Copyright Policy", "Disclaimer"]);
  });

  test("deduplicates repeated destinations", () => {
    const links = parseRelatedLinks(bisPage("<p>Body.</p>", sidebar), BASE);
    expect(new Set(links.map((l) => l.href)).size).toBe(links.length);
  });

  test("is empty when the page has no policy sidebar", () => {
    expect(parseRelatedLinks(bisPage("<p>Body.</p>"), BASE)).toEqual([]);
  });
});

describe("inline parsing", () => {
  test("collapses whitespace and decodes entities", () => {
    expect(parseInlines("  Terms\n  &amp;   Conditions  ", BASE)).toEqual([{ text: "Terms & Conditions" }]);
  });

  test("returns nothing for a whitespace-only fragment", () => {
    expect(parseInlines("&nbsp;", BASE)).toEqual([]);
  });
});
