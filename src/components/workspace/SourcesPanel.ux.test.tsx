import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesPanel } from "./SourcesPanel";
import { clearSources } from "@/lib/source-library";
import type { SourceCandidate } from "@/lib/source-search";
import type { QueryResponse } from "@/types/api";

beforeEach(() => {
  sessionStorage.clear();
  clearSources();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const INTRO = "Search BIS standards and documents";

function renderPanel(result?: QueryResponse) {
  return render(
    <SourcesPanel
      result={result}
      selectedSources={[] as SourceCandidate[]}
      onSelectionChange={vi.fn()}
      onResearch={vi.fn()}
      onOpenRecommendation={vi.fn()}
      onCollapse={vi.fn()}
    />,
  );
}

function answered(): QueryResponse {
  return {
    answer: "IS 14543 covers packaged drinking water.",
    query: "packaged drinking water",
    intent: "find_applicable_standard",
    outcome: "answered",
    interpretation: {
      product: null, material: null, useCase: null, targetUser: null, sector: null,
      certificationRequested: false, testingRequested: false,
    },
    recommendations: [{
      standardNumber: "IS 14543:2016",
      title: "Packaged Drinking Water",
      relevanceScore: 0.9,
      groundingState: "verified",
      reason: "",
      coverage: {
        product: "covered", material: "unknown", application: "unknown", targetUser: "unknown",
        sector: "unknown", testing: "unknown", certification: "unknown", identifier: "unknown",
        overallCoverageRatio: 1,
      },
      evidence: [],
      applicability: { state: "DIRECTLY_APPLICABLE", reason: "", materialConflict: false },
      recommendationStatus: "RECOMMENDED",
      primaryRecommendation: true,
    }],
    certification: { available: false, notes: null },
    testing: { available: false, notes: null },
    nextSteps: [],
    confidence: "high",
    engineConfidence: { score: 0.9, band: "high", groundingState: "verified", supportingSignals: [], limitingSignals: [] },
    conflicts: [],
    limitations: [],
  };
}

describe("SourcesPanel — empty-state hint", () => {
  test("is shown when nothing is listed yet", () => {
    renderPanel();
    expect(screen.getByText(INTRO)).toBeInTheDocument();
  });

  test("is not repeated underneath sources auto-populated from the centre query", () => {
    renderPanel(answered());
    expect(screen.getByText("Matching BIS sources (1)")).toBeInTheDocument();
    expect(screen.queryByText(INTRO)).not.toBeInTheDocument();
  });
});

describe("SourcesPanel — adding documents", () => {
  test("every rejected file in a multi-file add is reported, not only the last", async () => {
    vi.stubGlobal("fetch", vi.fn());
    renderPanel();
    await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText("Add source documents"), [
      new File(["x"], "a.docx"),
      new File([""], "empty.txt"),
    ]);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("a.docx: Only PDF and plain-text files are supported");
    expect(alert).toHaveTextContent("empty.txt: File is empty");
  });

  test("valid files in the same add are still uploaded alongside the rejections", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ identifiersFound: [], standards: [] }) });
    vi.stubGlobal("fetch", fetchSpy);
    renderPanel();
    await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText("Add source documents"), [
      new File(["x"], "a.docx"),
      new File(["IS 14543"], "spec.txt"),
    ]);
    expect(await screen.findByText("spec.txt")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("a non-JSON error response is reported as an upload failure, not an unreachable service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => {
        throw new SyntaxError("Unexpected token '<'");
      },
    }));
    renderPanel();
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), new File(["IS 14543"], "big.txt"));
    expect(await screen.findByText("Upload failed (HTTP 413)")).toBeInTheDocument();
    expect(screen.queryByText("Could not reach the analysis service")).not.toBeInTheDocument();
  });

  test("the drop highlight stays on while dragging over the panel's own children", () => {
    const { container } = renderPanel();
    const panel = container.querySelector("aside")!;
    const dropZone = screen.getByRole("button", { name: /click to add a document/i });

    fireEvent.dragOver(panel);
    expect(dropZone.className).toMatch(/border-navy bg-navy\/5/);
    // jsdom has no DragEvent, so fireEvent.dragLeave would drop relatedTarget;
    // a MouseEvent of type "dragleave" carries it.
    const dragLeave = (relatedTarget: EventTarget) =>
      fireEvent(panel, new MouseEvent("dragleave", { bubbles: true, relatedTarget }));
    dragLeave(dropZone);
    expect(dropZone.className).toMatch(/border-navy bg-navy\/5/);
    dragLeave(document.body);
    expect(dropZone.className).not.toMatch(/border-navy bg-navy\/5/);
  });
});
