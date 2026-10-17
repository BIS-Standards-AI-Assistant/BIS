import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesPanel } from "./SourcesPanel";
import { clearSources } from "@/lib/source-library";
import type { SourceCandidate } from "@/lib/source-search";
import type { QueryResponse, Recommendation } from "@/types/api";

// Covers the parts of the panel WorkspacePanels.test.tsx does not: the
// research summary for the current query, and document upload. These pin
// current behavior so the panel can be split into smaller components safely.

beforeEach(() => {
  sessionStorage.clear();
  clearSources();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function recommendation(standardNumber: string, overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    standardNumber,
    title: `Title of ${standardNumber}`,
    relevanceScore: 0.9,
    groundingState: "verified",
    reason: "Directly addresses the query.",
    coverage: {
      product: "covered", material: "unknown", application: "unknown", targetUser: "unknown",
      sector: "unknown", testing: "unknown", certification: "unknown", identifier: "unknown",
      overallCoverageRatio: 1,
    },
    evidence: [
      { chunkId: "c1", documentId: `doc-${standardNumber}`, document: "Doc", standardNumber, section: null, clause: "4.1", page: 2, text: "t", sourceUrl: "https://www.bis.gov.in/a.pdf" },
    ],
    applicability: { state: "DIRECTLY_APPLICABLE", reason: "Evidence supports it.", materialConflict: false },
    recommendationStatus: "RECOMMENDED",
    primaryRecommendation: true,
    ...overrides,
  };
}

function result(overrides: Partial<QueryResponse> = {}): QueryResponse {
  return {
    answer: "IS 14543 covers packaged drinking water.",
    query: "packaged drinking water",
    intent: "find_applicable_standard",
    isRelevant: true,
    outcome: "answered",
    latencyMs: 2345,
    interpretation: {
      product: "packaged drinking water", material: null, useCase: null, targetUser: null, sector: null,
      certificationRequested: false, testingRequested: false,
    },
    recommendations: [recommendation("IS 14543:2016")],
    certification: { available: false, notes: null },
    testing: { available: false, notes: null },
    nextSteps: [],
    confidence: "high",
    engineConfidence: { score: 0.9, band: "high", groundingState: "verified", supportingSignals: [], limitingSignals: [] },
    conflicts: [],
    limitations: [],
    ...overrides,
  };
}

function renderPanel(over: Partial<Parameters<typeof SourcesPanel>[0]> = {}) {
  const props = {
    selectedSources: [] as SourceCandidate[],
    onSelectionChange: vi.fn(),
    onResearch: vi.fn(),
    onOpenRecommendation: vi.fn(),
    onCollapse: vi.fn(),
    ...over,
  };
  return { ...render(<SourcesPanel {...props} />), props };
}

describe("SourcesPanel — research summary for the current query", () => {
  test("shows the answer with technical details: candidate count, source count and latency", () => {
    renderPanel({ result: result({ limitations: ["Only the 2016 edition is indexed."] }) });
    expect(screen.getByText("Research Summary")).toBeInTheDocument();
    expect(screen.getByText("IS 14543 covers packaged drinking water.")).toBeInTheDocument();
    expect(screen.getByText(/1 candidate standard · 1 supporting source/)).toBeInTheDocument();
    expect(screen.getByText("2.3s response")).toBeInTheDocument();
    expect(screen.getByText("Only the 2016 edition is indexed.")).toBeInTheDocument();
  });

  test("says when the query was translated for search", () => {
    renderPanel({ result: result({ translated: true }) });
    expect(screen.getByText(/translated to english for search/i)).toBeInTheDocument();
  });

  test("an irrelevant search explains why and offers example searches that start research", async () => {
    const { props } = renderPanel({
      result: result({ isRelevant: false, answer: "Not a BIS topic.", recommendations: [], outcome: "refused_out_of_scope" }),
    });
    expect(screen.getByText("This is not a relevant BIS search")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "LED bulb" }));
    expect(props.onResearch).toHaveBeenCalledWith("LED bulb");
  });

  test("conflicts, certification, testing and next steps are shown when present", () => {
    renderPanel({
      result: result({
        conflicts: [{ type: "superseded_standard", description: "IS 14543 may be withdrawn.", affectedStandards: ["IS 14543:2016"] }],
        certification: { available: true, notes: "ISI mark under Scheme-I." },
        testing: { available: false, notes: null },
        nextSteps: ["Apply for a BIS licence.", "Arrange factory testing."],
      }),
    });
    expect(screen.getByText("IS 14543 may be withdrawn.")).toBeInTheDocument();
    expect(screen.getByText("ISI mark under Scheme-I.")).toBeInTheDocument();
    expect(screen.getByText(/no testing information could be verified/i)).toBeInTheDocument();
    expect(screen.getByText("1. Apply for a BIS licence.")).toBeInTheDocument();
    expect(screen.getByText("2. Arrange factory testing.")).toBeInTheDocument();
  });

  test("certification and testing cards are hidden when neither is available", () => {
    renderPanel({ result: result() });
    expect(screen.queryByText(/certification pathway/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no testing information/i)).not.toBeInTheDocument();
  });

  test("the query's recommendations auto-populate the matching sources list", () => {
    renderPanel({ result: result() });
    expect(screen.getByText("Matching BIS sources (1)")).toBeInTheDocument();
  });

  test("a refused query does not also list its candidates as matching sources", () => {
    renderPanel({ result: result({ outcome: "refused_insufficient_evidence" }) });
    expect(screen.queryByText(/matching bis sources/i)).not.toBeInTheDocument();
  });

  test("a new centre query clears a stale manual search", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }));
    const props = {
      selectedSources: [] as SourceCandidate[],
      onSelectionChange: vi.fn(),
      onResearch: vi.fn(),
      onOpenRecommendation: vi.fn(),
      onCollapse: vi.fn(),
    };
    const { rerender } = render(<SourcesPanel {...props} result={result({ query: "first" })} />);
    await userEvent.setup().type(screen.getByLabelText(/search bis standards/i), "zzz{Enter}");
    expect(await screen.findByText(/no matching bis sources found/i)).toBeInTheDocument();

    rerender(<SourcesPanel {...props} result={result({ query: "second" })} />);
    expect(screen.queryByText(/no matching bis sources found/i)).not.toBeInTheDocument();
    expect(screen.getByText("Matching BIS sources (1)")).toBeInTheDocument();
  });

  test("a failed source search shows an error and does not start research", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    const { props } = renderPanel();
    await userEvent.setup().type(screen.getByLabelText(/search bis standards/i), "steel{Enter}");
    expect(await screen.findByText(/couldn't search bis sources/i)).toBeInTheDocument();
    expect(props.onResearch).not.toHaveBeenCalled();
  });
});

describe("SourcesPanel — adding documents", () => {
  const file = (name: string, content = "IS 14543:2016 applies.") => new File([content], name, { type: "text/plain" });

  test("an unsupported file is rejected with a reason and never uploaded", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderPanel();
    await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText("Add source documents"), file("notes.docx"));
    expect(await screen.findByText(/notes\.docx: only pdf and plain-text files are supported/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("a document is analysed and lists the standards it cites, marking which are indexed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        identifiersFound: [{ resolvedNumber: "IS 14543:2016" }, { resolvedNumber: "IS 9999:2001" }, { resolvedNumber: "IS 14543:2016" }],
        standards: [{ standardNumber: "IS 14543:2016" }],
        limitations: ["Scanned pages were not read."],
      }),
    }));
    renderPanel();
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), file("spec.txt"));

    expect(await screen.findByText("2 Indian Standards cited · 1 in this system")).toBeInTheDocument();
    expect(screen.getByTitle("In this system's knowledge base")).toHaveTextContent("IS 14543:2016");
    expect(screen.getByTitle("Cited by the document, not indexed here")).toHaveTextContent("IS 9999:2001");
    expect(screen.getByText("Scanned pages were not read.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add another document" })).toBeInTheDocument();
  });

  test("the upload goes to the analysis endpoint as multipart form data", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ identifiersFound: [], standards: [] }) });
    vi.stubGlobal("fetch", fetchSpy);
    renderPanel();
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), file("spec.txt"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/v1/analyze-document");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(await screen.findByText("No Indian Standard references found")).toBeInTheDocument();
  });

  test("a server error is shown on the document's row", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({ error: "File too large for analysis" }) }));
    renderPanel();
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), file("big.txt"));
    expect(await screen.findByText("File too large for analysis")).toBeInTheDocument();
  });

  test("a network failure is shown on the document's row", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderPanel();
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), file("spec.txt"));
    expect(await screen.findByText("Could not reach the analysis service")).toBeInTheDocument();
  });

  test("a document can be removed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ identifiersFound: [], standards: [] }) }));
    renderPanel();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Add source documents"), file("spec.txt"));
    const row = (await screen.findByText("spec.txt")).closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Remove spec.txt" }));
    expect(screen.queryByText("spec.txt")).not.toBeInTheDocument();
  });
});
