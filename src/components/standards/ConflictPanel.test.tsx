import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConflictPanel } from "./ConflictPanel";
import type { Conflict } from "@/types/api";

describe("ConflictPanel", () => {
  test("renders nothing when there are no conflicts", () => {
    const { container } = render(<ConflictPanel conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders the engine's own description verbatim, not an invented one", () => {
    const conflicts: Conflict[] = [
      {
        type: "version_conflict",
        description: "Multiple editions/variants of IS 302 were retrieved (IS 302 (Part 2/Sec 6):2009, IS 302 (Part 2/Sec 26):2014).",
        affectedStandards: ["IS 302 (Part 2/Sec 6):2009", "IS 302 (Part 2/Sec 26):2014"],
      },
    ];
    render(<ConflictPanel conflicts={conflicts} />);
    expect(screen.getByText(conflicts[0].description)).toBeInTheDocument();
    expect(screen.getByText("Multiple editions retrieved")).toBeInTheDocument();
  });

  test("never labels a conflict as 'legal' — only what the engine's type asserts", () => {
    const conflicts: Conflict[] = [
      { type: "evidence_conflict", description: "test", affectedStandards: ["IS 1:2000"] },
    ];
    render(<ConflictPanel conflicts={conflicts} />);
    expect(screen.queryByText(/legal conflict/i)).not.toBeInTheDocument();
  });

  test("tells the user to review sources before a compliance decision", () => {
    render(<ConflictPanel conflicts={[{ type: "superseded_standard", description: "test", affectedStandards: [] }]} />);
    expect(screen.getByText(/review the cited sources/i)).toBeInTheDocument();
  });

  test("renders one entry per conflict", () => {
    const conflicts: Conflict[] = [
      { type: "version_conflict", description: "first", affectedStandards: [] },
      { type: "evidence_conflict", description: "second", affectedStandards: [] },
    ];
    render(<ConflictPanel conflicts={conflicts} />);
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});
