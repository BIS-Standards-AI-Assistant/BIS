import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelevanceExplainer } from "./RelevanceExplainer";

describe("RelevanceExplainer", () => {
  test("explains all four real UI elements shown next to a recommendation", () => {
    render(<RelevanceExplainer />);
    expect(screen.getByRole("heading", { name: "Why is this Standard Relevant?" })).toBeInTheDocument();
    expect(screen.getByText("1. Relevance meter")).toBeInTheDocument();
    expect(screen.getByText("2. Grounding badge")).toBeInTheDocument();
    expect(screen.getByText("3. Coverage check")).toBeInTheDocument();
    expect(screen.getByText("4. Evidence excerpts")).toBeInTheDocument();
  });

  test("names all three real grounding states with their exact production labels", () => {
    // Must match RecommendationCard.tsx's GROUNDING_LABEL exactly — this page
    // is documentation of that component, not independent copy.
    render(<RelevanceExplainer />);
    expect(screen.getByText("Directly supported by evidence")).toBeInTheDocument();
    expect(screen.getByText("Inferred from related evidence")).toBeInTheDocument();
    expect(screen.getByText("Evidence doesn't fully establish this")).toBeInTheDocument();
  });

  test("explains that the meter is deliberately band-based, not a raw percentage", () => {
    // The page uses "87% relevant" once, only as the hypothetical it argues
    // against — the point is that no such number appears in the real UI.
    render(<RelevanceExplainer />);
    expect(screen.getByText(/never as a raw percentage/i)).toBeInTheDocument();
    expect(screen.getByText(/model-estimated, not a calibrated statistic/i)).toBeInTheDocument();
  });

  test("links to the real search flow instead of an external site", () => {
    render(<RelevanceExplainer />);
    expect(screen.getByText("Ask about a Standard").closest("a")).toHaveAttribute("href", "/?focus=search");
    expect(screen.getByText("Browse Standards").closest("a")).toHaveAttribute("href", "/standards");
  });
});
