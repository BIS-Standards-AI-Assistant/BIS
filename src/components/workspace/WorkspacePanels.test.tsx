import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesPanel } from "./SourcesPanel";
import type { SourceCandidate } from "@/lib/source-search";
import { WorkspacePanel } from "./WorkspacePanel";

/** The real /api/v1/analyze-document response shape. */

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  // The assistant conversation is module-level and shared on purpose, so it
  // has to be cleared between cases.
  // jsdom has no layout engine, so scrollIntoView is undefined on elements.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const chunk = (standardNumber: string | null, title: string, over: Record<string, unknown> = {}) => ({
  chunkId: `c-${standardNumber ?? title}-${Math.random()}`,
  documentId: `d-${standardNumber ?? title}`,
  standardNumber,
  title,
  sourceUrl: "https://www.bis.gov.in/x.pdf",
  sourceOrg: "BIS",
  section: null,
  clause: "5.2",
  page: 3,
  text: "t",
  semanticScore: 0.8,
  keywordScore: 0.6,
  identifierMatch: false,
  score: 0.9,
  rerankReason: "r",
  ...over,
});

function searchResponse(chunks: unknown[]) {
  return { ok: true, json: async () => ({ query: "q", results: chunks }) };
}

function renderSources(over: Partial<Parameters<typeof SourcesPanel>[0]> = {}) {
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

describe("SourcesPanel — left panel retrieves sources, it does not chat (§3, §4)", () => {
  test("its input is a source search, not a chat prompt", () => {
    renderSources();
    expect(screen.getByLabelText(/search bis standards and documents/i)).toBeInTheDocument();
    // The prompt box this replaced must not linger.
    expect(screen.queryByPlaceholderText(/ask about your sources/i)).not.toBeInTheDocument();
  });

  test("searching calls the retrieval endpoint, never the chat endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(searchResponse([chunk("IS 1239:2004", "Steel Tubes")]));
    vi.stubGlobal("fetch", fetchSpy);

    const { props } = renderSources();
    await userEvent.setup().type(screen.getByLabelText(/search bis standards/i), "steel pipes{Enter}");

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/v1/search");
    // §4: the left panel must not generate a conversational answer.
    expect(fetchSpy.mock.calls.every((c) => c[0] !== "/api/v1/chat")).toBe(true);
    expect(props.onResearch).toHaveBeenCalledWith("steel pipes");
  });

  test("results show standard, title and indexed evidence — never 'recommended' (§5)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(searchResponse([
      chunk("IS 1239:2004", "Steel Tubes"),
      chunk("IS 1239:2004", "Steel Tubes"),
    ])));

    renderSources();
    await userEvent.setup().type(screen.getByLabelText(/search bis standards/i), "steel{Enter}");

    expect(await screen.findByText("IS 1239:2004")).toBeInTheDocument();
    expect(screen.getByText("Steel Tubes")).toBeInTheDocument();
    expect(screen.getByText(/2 indexed passages/i)).toBeInTheDocument();
    // Retrieval relevance is not an applicability claim.
    expect(screen.queryByText(/recommended/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/applicable/i)).not.toBeInTheDocument();
  });

  test("a source can be selected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(searchResponse([chunk("IS 1239:2004", "Steel Tubes")])));
    const { props } = renderSources();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/search bis standards/i), "steel{Enter}");
    await user.click(await screen.findByRole("button", { name: "Select" }));

    expect(props.onSelectionChange).toHaveBeenCalledWith([expect.objectContaining({ standardNumber: "IS 1239:2004" })]);
  });

  test("selected sources are listed, removable, and clearable (§6)", async () => {
    const selected: SourceCandidate[] = [
      { id: "IS 1239:2004", standardNumber: "IS 1239:2004", title: "Steel Tubes", documentId: "d1", sourceUrl: "u", sourceOrg: "BIS", matchingPassages: 2, topScore: 0.9, identifierMatch: false },
    ];
    const { props } = renderSources({ selectedSources: selected });

    expect(screen.getByText("Selected sources (1)")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear all" }));
    expect(props.onSelectionChange).toHaveBeenCalledWith([]);
  });

  test("says it is searching sources, not generating an answer (§9)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
    renderSources();
    await userEvent.setup().type(screen.getByLabelText(/search bis standards/i), "steel{Enter}");

    expect(await screen.findByText(/searching bis sources/i)).toBeInTheDocument();
    expect(screen.queryByText(/generating answer/i)).not.toBeInTheDocument();
  });

  test("no results suggests next steps and fabricates nothing (§10)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(searchResponse([])));
    renderSources();
    await userEvent.setup().type(screen.getByLabelText(/search bis standards/i), "zzz{Enter}");

    expect(await screen.findByText(/no matching bis sources found/i)).toBeInTheDocument();
    expect(screen.getByText(/try a standard number/i)).toBeInTheDocument();
  });

  test("document upload survives as a secondary affordance (§7, §45)", () => {
    renderSources();
    expect(screen.getByText(/add your document/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Add source documents")).toBeInTheDocument();
  });

  test("collapses on request", async () => {
    const { props } = renderSources();
    await userEvent.setup().click(screen.getByRole("button", { name: /collapse sources panel/i }));
    expect(props.onCollapse).toHaveBeenCalled();
  });
});

describe("WorkspacePanel", () => {
  test("offers exactly the two workspace actions", () => {
    render(<WorkspacePanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    for (const name of ["Testings", "Certifications"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // The formats from the earlier design are gone, and Audio Overview is
    // withdrawn for now rather than shown as a disabled placeholder.
    for (const gone of ["Audio Overview", "Video Overview", "Mind Map", "Reports", "Flashcards", "Quiz", "Infographic", "Data Table"]) {
      expect(screen.queryByText(gone), gone).not.toBeInTheDocument();
    }
  });

  test("is titled Workspace, not Studio", () => {
    render(<WorkspacePanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.queryByText("Studio")).not.toBeInTheDocument();
  });

  test("Testing and Certification go to this service's real sections", () => {
    render(<WorkspacePanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    expect(screen.getByRole("link", { name: /Testings/ })).toHaveAttribute("href", "/testing");
    expect(screen.getByRole("link", { name: /Certifications/ })).toHaveAttribute("href", "/certification");
  });

  test("shows real search history, not invented notebooks", async () => {
    localStorage.setItem(
      "bis-recent-queries",
      JSON.stringify([
        { query: "Domestic pressure cooker", standardNumbers: ["IS 2347:2017"], confidence: "high", timestamp: Date.now() },
      ]),
    );

    const onRerun = vi.fn();
    render(<WorkspacePanel onRerun={onRerun} onCollapse={vi.fn()} />);

    const entry = screen.getByText("Domestic pressure cooker");
    expect(screen.getByText(/1 standard$/)).toBeInTheDocument();

    await userEvent.setup().click(entry);
    expect(onRerun).toHaveBeenCalledWith("Domestic pressure cooker");
  });

  test("says the history is empty rather than showing placeholder entries", () => {
    render(<WorkspacePanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    const recent = screen.getByText(/Recent searches/i).closest("div");
    expect(within(recent as HTMLElement).getByText(/Nothing yet/i)).toBeInTheDocument();
  });

  test("collapses on request", async () => {
    const onCollapse = vi.fn();
    render(<WorkspacePanel onRerun={vi.fn()} onCollapse={onCollapse} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /collapse workspace panel/i }));
    expect(onCollapse).toHaveBeenCalled();
  });
});

