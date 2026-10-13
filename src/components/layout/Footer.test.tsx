import { describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Footer, FOOTER_COLUMN_HREFS } from "./Footer";
import { DICTIONARIES } from "@/lib/i18n";
import { findNavItem } from "@/lib/navigation";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

function columnLink(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  return within(heading.parentElement!).getByRole("link");
}

describe("Footer link columns", () => {
  test("each column links to the page on its own subject", () => {
    render(
      <LanguageProvider>
        <Footer />
      </LanguageProvider>,
    );
    expect(columnLink("Know About BIS")).toHaveAttribute("href", "/about");
    expect(columnLink("Standards Development")).toHaveAttribute("href", "/about/standards-development-process");
    expect(columnLink("Publications")).toHaveAttribute("href", "/resources/publications");
    expect(columnLink("Help & Support")).toHaveAttribute("href", "/resources/faq");
  });

  test("there is a link for every column in every language", () => {
    for (const dict of Object.values(DICTIONARIES)) {
      expect(dict.footer.columns).toHaveLength(FOOTER_COLUMN_HREFS.length);
    }
  });

  test("every column link resolves to a real page, not a 404", () => {
    for (const href of FOOTER_COLUMN_HREFS) {
      const [, section, ...slug] = href.split("/");
      if (slug.length === 0) continue; // a section root, e.g. /about
      expect(findNavItem(section, slug), href).not.toBeNull();
    }
  });
});
