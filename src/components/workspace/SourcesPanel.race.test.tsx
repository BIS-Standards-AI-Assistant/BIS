import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesPanel } from "./SourcesPanel";
import { clearSources } from "@/lib/source-library";
import type { SourceCandidate } from "@/lib/source-search";
import type { QueryResponse, RetrievedChunk } from "@/types/api";

// A manual search in the Sources panel is superseded when the centre moves
// on to a new query. These cover a search that is still in flight when
// that happens.

beforeEach(() => {
  sessionStorage.clear();
  clearSources();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function result(query: string): QueryResponse {
  return {
    answer: "IS 14543 covers packaged drinking water.",
    query,
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
      evidence: [
        { chunkId: "c1", documentId: "doc-14543", document: "Doc", standardNumber: "IS 14543:2016", section: null, clause: "4.1", page: 2, text: "t", sourceUrl: "https://www.bis.gov.in/a.pdf" },
      ],
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

/** A fetch whose responses are released by hand, in any order. */
function deferredFetch() {
  const pending: ((r: Response) => void)[] = [];
  const fetchMock = vi.fn(
    () => new Promise<Response>((resolve) => {
      pending.push(resolve);
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const respond = (i: number, results: RetrievedChunk[] = []) =>
    act(async () => {
      pending[i](new Response(JSON.stringify({ results }), { status: 200 }));
    });
  const fail = (i: number) =>
    act(async () => {
      pending[i](new Response("{}", { status: 500 }));
    });
  return { fetchMock, respond, fail };
}

function setup() {
  const props = {
    selectedSources: [] as SourceCandidate[],
    onSelectionChange: vi.fn(),
    onResearch: vi.fn(),
    onOpenRecommendation: vi.fn(),
    onCollapse: vi.fn(),
  };
  const view = render(<SourcesPanel {...props} result={result("first")} />);
  const moveCentreTo = (query: string) => view.rerender(<SourcesPanel {...props} result={result(query)} />);
  return { props, moveCentreTo };
}

const searchBox = () => screen.getByLabelText(/search bis standards/i);

test("a search still in flight when the centre query changes does not land afterwards", async () => {
  const { respond } = deferredFetch();
  const { props, moveCentreTo } = setup();
  await userEvent.setup().type(searchBox(), "zzz{Enter}");

  moveCentreTo("second");
  expect(screen.getByText("Matching BIS sources (1)")).toBeInTheDocument();

  await respond(0);
  // The new query's sources stay listed, and no research opens on the old search.
  expect(screen.queryByText(/no matching bis sources found/i)).not.toBeInTheDocument();
  expect(screen.getByText("Matching BIS sources (1)")).toBeInTheDocument();
  expect(props.onResearch).not.toHaveBeenCalled();
});

test("a superseded search that fails shows no error", async () => {
  const { fail } = deferredFetch();
  const { moveCentreTo } = setup();
  await userEvent.setup().type(searchBox(), "zzz{Enter}");

  moveCentreTo("second");
  await fail(0);
  expect(screen.queryByText(/couldn't search bis sources/i)).not.toBeInTheDocument();
});

test("the search box is usable again as soon as the centre moves on", async () => {
  const { fetchMock, respond } = deferredFetch();
  const { props, moveCentreTo } = setup();
  const user = userEvent.setup();
  await user.type(searchBox(), "zzz{Enter}");
  expect(searchBox()).toBeDisabled();

  moveCentreTo("second");
  expect(searchBox()).not.toBeDisabled();

  // A new search starts; the old one finishing must not clear its spinner.
  await user.clear(searchBox());
  await user.type(searchBox(), "steel{Enter}");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await respond(0);
  expect(searchBox()).toBeDisabled();

  await respond(1);
  expect(searchBox()).not.toBeDisabled();
  expect(props.onResearch).toHaveBeenCalledTimes(1);
  expect(props.onResearch).toHaveBeenCalledWith("steel");
});
