import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvidenceExcerpt } from "./EvidenceExcerpt";

const base = {
  standardNumber: "IS 15410:2003",
  documentTitle: "Containers for packaging of natural mineral water",
  text: "Bottles shall be made from food-grade material.",
  sourceUrl: "https://www.bis.gov.in/some-document",
};

describe("EvidenceExcerpt: labelling", () => {
  test("is labelled as source evidence, not as a gazetted or official-gazette text", () => {
    render(<EvidenceExcerpt {...base} />);
    expect(screen.getByText("Source evidence")).toBeInTheDocument();
    expect(screen.queryByText(/gazett/i)).not.toBeInTheDocument();
  });

  test("the source link says what it is and that it opens a new tab", () => {
    render(<EvidenceExcerpt {...base} />);
    const link = screen.getByRole("link", { name: /Open source document/ });
    expect(link).toHaveAccessibleName("Open source document (opens in a new tab)");
    expect(link).toHaveAttribute("href", "https://www.bis.gov.in/some-document");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

describe("EvidenceExcerpt: source link safety", () => {
  test.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "/relative/path", "  "])(
    "renders no link for %j",
    (sourceUrl) => {
      render(<EvidenceExcerpt {...base} sourceUrl={sourceUrl} />);
      // No standardHref is given, so any link at all would be the source link.
      expect(screen.queryAllByRole("link")).toHaveLength(0);
      // The passage itself is still shown.
      expect(screen.getByText(base.text)).toBeInTheDocument();
    },
  );

  test("an http URL with surrounding whitespace is trimmed, not dropped", () => {
    render(<EvidenceExcerpt {...base} sourceUrl="  http://example.org/doc  " />);
    expect(screen.getByRole("link", { name: /Open source document/ })).toHaveAttribute("href", "http://example.org/doc");
  });
});

describe("EvidenceExcerpt: content", () => {
  test("shows the locator built from section, clause and page", () => {
    render(<EvidenceExcerpt {...base} section="Annex A" clause="4.1" page={7} />);
    expect(screen.getByText("Annex A · clause 4.1 · p. 7")).toBeInTheDocument();
  });

  test("links the standard when a standard page exists", () => {
    render(<EvidenceExcerpt {...base} standardHref="/standards/abc" />);
    expect(screen.getByRole("link", { name: "IS 15410:2003" })).toHaveAttribute("href", "/standards/abc");
  });

  test("falls back to the document title when there is no standard number", () => {
    render(<EvidenceExcerpt {...base} standardNumber={null} />);
    expect(screen.getByText(base.documentTitle)).toBeInTheDocument();
  });
});
