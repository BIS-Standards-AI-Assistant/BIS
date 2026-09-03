import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PolicyPageView } from "./PolicyPageView";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { getPolicyPage, type PolicyPageKey } from "@/lib/policy-pages";

// PolicyPageView renders Header, which renders SearchOverlay
// unconditionally; SearchOverlay calls useRouter() from next/navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderPage(key: PolicyPageKey) {
  const page = getPolicyPage(key)!;
  render(
    <LanguageProvider>
      <PolicyPageView page={page} />
    </LanguageProvider>,
  );
  return page;
}

/** The main content, excluding the site header and footer around it. */
function content() {
  return within(screen.getByRole("main"));
}

describe("PolicyPageView", () => {
  test("renders BIS's own page title as the heading", () => {
    renderPage("privacy-policy");
    expect(content().getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
  });

  test("renders the policy text verbatim from the scraped source", () => {
    const page = renderPage("terms-and-conditions");
    const en = page.variants.find((v) => v.lang === "en")!;
    for (const block of en.blocks) {
      if (block.type !== "paragraph") continue;
      const text = block.runs.map((r) => r.text).join(" ");
      expect(content().getByText(text, { exact: false })).toBeInTheDocument();
    }
  });

  test("attributes the text to BIS and links to the page it was copied from", () => {
    const page = renderPage("privacy-policy");
    const en = page.variants.find((v) => v.lang === "en")!;
    expect(content().getByText(/reproduced here word for word/i)).toBeInTheDocument();
    expect(content().getByRole("link", { name: /bis\.gov\.in/i })).toHaveAttribute("href", en.sourceUrl);
    expect(content().getByText(new RegExp(page.retrieved))).toBeInTheDocument();
  });

  test("shows BIS's own last-updated line when the source states one", () => {
    renderPage("terms-and-conditions");
    expect(content().getByText(/Last updated on the source:/)).toHaveTextContent("January 20, 2021");
  });

  test("says the date is not stated rather than inventing one", () => {
    renderPage("privacy-policy");
    expect(content().getByText(/not stated on the BIS page/i)).toBeInTheDocument();
  });

  test("offers the other BIS website policies without reproducing them", () => {
    renderPage("privacy-policy");
    const related = within(content().getByRole("region", { name: /other bis website policies/i }));
    expect(related.getByRole("link", { name: /disclaimer/i })).toBeInTheDocument();
    expect(content().getByText(/not reproduced here and open on bis\.gov\.in/i)).toBeInTheDocument();
  });

  test("marks the content with the language it is actually written in", () => {
    renderPage("privacy-policy");
    expect(content().getByRole("heading", { level: 1 })).toHaveAttribute("lang", "en");
  });

  test("does not claim a translation exists when BIS publishes English only", () => {
    // Default UI language is English, so no fallback note should appear.
    renderPage("privacy-policy");
    expect(content().queryByText(/publishes this page in/i)).not.toBeInTheDocument();
  });
});
