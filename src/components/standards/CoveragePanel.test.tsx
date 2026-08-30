import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoveragePanel } from "./CoveragePanel";
import type { CoverageResult } from "@/types/api";

function coverage(overrides: Partial<CoverageResult> = {}): CoverageResult {
  return {
    product: "unknown",
    material: "unknown",
    application: "unknown",
    targetUser: "unknown",
    sector: "unknown",
    testing: "unknown",
    certification: "unknown",
    identifier: "unknown",
    overallCoverageRatio: 1,
    ...overrides,
  };
}

describe("CoveragePanel", () => {
  test("renders nothing when every dimension is unknown", () => {
    const { container } = render(<CoveragePanel coverage={coverage()} />);
    expect(container.firstChild).toBeNull();
  });

  test("shows only applicable (non-unknown) dimensions", () => {
    render(<CoveragePanel coverage={coverage({ product: "covered", material: "not_covered" })} />);
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.queryByText("Testing requirement")).not.toBeInTheDocument();
  });

  test("labels a not_covered dimension as not established by the evidence", () => {
    render(<CoveragePanel coverage={coverage({ testing: "not_covered" })} />);
    expect(screen.getByText(/not established by the evidence/i)).toBeInTheDocument();
  });

  test("never fabricates a covered dimension the engine didn't report", () => {
    render(<CoveragePanel coverage={coverage({ product: "covered" })} />);
    // Only the one covered dimension we passed in should render.
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.queryByText("Material")).not.toBeInTheDocument();
    expect(screen.queryByText("Sector")).not.toBeInTheDocument();
  });
});
