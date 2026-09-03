import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesPanel } from "./SourcesPanel";
import { WorkspacePanel } from "./WorkspacePanel";
import { getSourcesSnapshot, selectedStandardNumbers } from "@/lib/source-library";
import type { QueryInterpretation } from "@/types/api";

const INTERPRETATION = {
  product: "pressure cooker",
  material: null,
  useCase: null,
  targetUser: null,
  sector: null,
  certificationRequested: false,
  testingRequested: false,
} as unknown as QueryInterpretation;

function pdf(name = "cooker-spec.pdf") {
  return new File(["%PDF-1.4 test"], name, { type: "application/pdf" });
}

/** The real /api/v1/analyze-document response shape. */
function analysisResponse(standardNumbers: string[], limitations: string[] = [], alsoCited: string[] = []) {
  const cited = [...standardNumbers, ...alsoCited];
  return {
    ok: true,
    json: async () => ({
      extractedChars: 1200,
      identifiersFound: cited.map((resolvedNumber) => ({
        identifierText: resolvedNumber,
        resolvedNumber,
        inDatabase: standardNumbers.includes(resolvedNumber),
      })),
      standards: standardNumbers.map((standardNumber) => ({ standardNumber, title: null, evidenceCount: 1 })),
      limitations,
    }),
  };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SourcesPanel — adding documents", () => {
  test("shows the empty state until a document is added", () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);
    expect(screen.getByText("Saved sources will appear here")).toBeInTheDocument();
  });

  test("the prompt box offers a document input and an ask button, and nothing web", () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /ask about your sources/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add a document/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask" })).toBeInTheDocument();
    expect(screen.queryByText("Web")).not.toBeInTheDocument();
    expect(screen.queryByText("Fast Research")).not.toBeInTheDocument();
    expect(screen.queryByText(/Drop files here/i)).not.toBeInTheDocument();
  });

  test("the document button opens the file picker", async () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);
    const input = screen.getByLabelText("Add source documents") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    await userEvent.setup().click(screen.getByRole("button", { name: /add a document/i }));
    expect(clickSpy).toHaveBeenCalled();
  });

  test("says a document is needed before questions can be answered", () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);
    expect(screen.getByText(/Add a document first/i)).toBeInTheDocument();
  });

  test("uploads the file to the real analysis endpoint and lists what it cites", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(analysisResponse(["IS 2347:2017", "IS 3074:2018"]));
    vi.stubGlobal("fetch", fetchSpy);

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), pdf());

    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/analyze-document", expect.objectContaining({ method: "POST" }));
    expect(fetchSpy.mock.calls[0][1].body).toBeInstanceOf(FormData);

    expect(await screen.findByText("cooker-spec.pdf")).toBeInTheDocument();
    expect(await screen.findByText("2 Indian Standards cited · 2 in this system")).toBeInTheDocument();
    expect(screen.getByText("IS 2347:2017")).toBeInTheDocument();
  });

  test("says so when a document cites no Indian Standard, rather than implying it did", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(analysisResponse([])));

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), pdf());

    expect(await screen.findByText("No Indian Standard references found")).toBeInTheDocument();
  });

  test("surfaces what the analyzer could not establish", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(analysisResponse(["IS 2347:2017"], ["Two identifiers were not found in the database."])));

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), pdf());

    expect(await screen.findByText(/not found in the database/i)).toBeInTheDocument();
  });

  test("reports a rejected upload instead of failing silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: "Failed to parse document" }) }),
    );

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), pdf());

    expect(await screen.findByText("Failed to parse document")).toBeInTheDocument();
  });

  test("refuses an unsupported dropped file before uploading it", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<SourcesPanel onCollapse={vi.fn()} />);
    // The file picker's accept="" filter blocks this in the browser; a drop
    // does not, so the guard has to hold here.
    fireEvent.drop(screen.getByRole("complementary"), {
      dataTransfer: { files: [new File(["x"], "photo.png", { type: "image/png" })] },
    });

    expect(await screen.findByText(/Only PDF and plain-text files are supported/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("accepts a dropped PDF", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(analysisResponse(["IS 2347:2017"])));

    render(<SourcesPanel onCollapse={vi.fn()} />);
    fireEvent.drop(screen.getByRole("complementary"), { dataTransfer: { files: [pdf("dropped.pdf")] } });

    expect(await screen.findByText("dropped.pdf")).toBeInTheDocument();
    expect(await screen.findByText("1 Indian Standard cited · 1 in this system")).toBeInTheDocument();
  });

  test("a source can be removed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(analysisResponse(["IS 2347:2017"])));
    const user = userEvent.setup();

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await user.upload(screen.getByLabelText("Add source documents"), pdf());
    await screen.findByText("cooker-spec.pdf");

    await user.click(screen.getByRole("button", { name: /remove cooker-spec\.pdf/i }));
    expect(screen.queryByText("cooker-spec.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("Saved sources will appear here")).toBeInTheDocument();
  });

  test("a question is answered from the standards the added sources cite", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(analysisResponse(["IS 2347:2017"]))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          scope: "current_results",
          answer: "IS 2347:2017 covers domestic pressure cookers.",
          evidence: [{ standardNumber: "IS 2347:2017", document: "Product Manual", clause: "4.1", page: 3, text: "Scope covers pressure cookers for domestic use." }],
          limitations: [],
        }),
      });
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await user.upload(screen.getByLabelText("Add source documents"), pdf("cooker.pdf"));
    await screen.findByText("cooker.pdf");

    await user.type(screen.getByRole("textbox", { name: /ask about your sources/i }), "what does it require?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText(/covers domestic pressure cookers/i)).toBeInTheDocument();

    // Scoped by identifier to what the document cites — never its text.
    const body = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(body.standardNumbers).toEqual(["IS 2347:2017"]);
    expect(body.message).toBe("what does it require?");
  });

  test("the answer shows the evidence it came from", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(analysisResponse(["IS 2347:2017"]))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            scope: "current_results",
            answer: "It covers domestic pressure cookers.",
            evidence: [{ standardNumber: "IS 2347:2017", document: "Product Manual", clause: "4.1", page: 3, text: "Scope covers pressure cookers for domestic use." }],
          }),
        }),
    );
    const user = userEvent.setup();

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await user.upload(screen.getByLabelText("Add source documents"), pdf("cooker.pdf"));
    await screen.findByText("cooker.pdf");

    await user.type(screen.getByRole("textbox", { name: /ask about your sources/i }), "scope?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    await screen.findByText(/It covers domestic pressure cookers/i);
    // Once as the source row's chip, once as the answer's citation.
    expect(screen.getAllByText("IS 2347:2017")).toHaveLength(2);
    expect(screen.getByText(/clause 4\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Scope covers pressure cookers/)).toBeInTheDocument();
  });

  test("reports a failed question instead of showing nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(analysisResponse(["IS 2347:2017"]))
        .mockRejectedValueOnce(new Error("offline")),
    );
    const user = userEvent.setup();

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await user.upload(screen.getByLabelText("Add source documents"), pdf("cooker.pdf"));
    await screen.findByText("cooker.pdf");

    await user.type(screen.getByRole("textbox", { name: /ask about your sources/i }), "scope?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText(/Could not reach the assistant service/i)).toBeInTheDocument();
  });

  test("shows what the search was understood as, once there is a result", () => {
    render(<SourcesPanel interpretation={INTERPRETATION} onCollapse={vi.fn()} />);
    expect(screen.getByText(/Search Context/i)).toBeInTheDocument();
    expect(screen.getByText("pressure cooker")).toBeInTheDocument();
  });

  test("collapses on request — it is a workspace panel, not fixed navigation", async () => {
    const onCollapse = vi.fn();
    render(<SourcesPanel onCollapse={onCollapse} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /collapse sources panel/i }));
    expect(onCollapse).toHaveBeenCalled();
  });
});

describe("the knowledge base shared with the assistant", () => {
  test("a standard cited by an added document becomes part of the shared scope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(analysisResponse(["IS 2347:2017", "IS 3074:2018"])));

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), pdf());
    await screen.findByText("2 Indian Standards cited · 2 in this system");

    await waitFor(() =>
      expect(selectedStandardNumbers(getSourcesSnapshot())).toEqual(["IS 2347:2017", "IS 3074:2018"]),
    );
  });

  test("deselecting a source takes it back out of scope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(analysisResponse(["IS 2347:2017"])));
    const user = userEvent.setup();

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await user.upload(screen.getByLabelText("Add source documents"), pdf());
    await screen.findByText("1 Indian Standard cited · 1 in this system");

    await user.click(screen.getByRole("checkbox", { name: /cooker-spec\.pdf/i }));
    await waitFor(() => expect(selectedStandardNumbers(getSourcesSnapshot())).toEqual([]));
  });

  test("the same standard cited by two documents is one piece of context, not two", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(analysisResponse(["IS 2347:2017"])));
    const user = userEvent.setup();

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await user.upload(screen.getByLabelText("Add source documents"), pdf("a.pdf"));
    await screen.findByText("a.pdf");
    await user.upload(screen.getByLabelText("Add source documents"), pdf("b.pdf"));
    await screen.findByText("b.pdf");

    await waitFor(() => expect(selectedStandardNumbers(getSourcesSnapshot())).toEqual(["IS 2347:2017"]));
  });

  test("a document still being analysed contributes nothing yet", async () => {
    let release: (v: unknown) => void = () => {};
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise((r) => (release = r))));

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), pdf());

    expect(await screen.findByText("Reading document…")).toBeInTheDocument();
    expect(selectedStandardNumbers(getSourcesSnapshot())).toEqual([]);

    release(analysisResponse(["IS 2347:2017"]));
    await waitFor(() => expect(selectedStandardNumbers(getSourcesSnapshot())).toEqual(["IS 2347:2017"]));
  });

  test("a cited standard this system has not indexed is shown, but not shared as if usable", async () => {
    // Exactly what a real upload produces today: identifiers extracted from
    // the document, none of them resolvable in the knowledge base.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        analysisResponse([], ["2 identifier(s) were found in the document text but do not match a standard currently in this system's knowledge base"], [
          "IS 15450:2004",
          "IS 4985:2021",
        ]),
      ),
    );

    render(<SourcesPanel onCollapse={vi.fn()} />);
    await userEvent.setup().upload(screen.getByLabelText("Add source documents"), pdf());

    // The document really does cite them, so they are shown...
    expect(await screen.findByText("2 Indian Standards cited · 0 in this system")).toBeInTheDocument();
    expect(screen.getByText("IS 15450:2004")).toBeInTheDocument();
    expect(screen.getByText(/do not match a standard currently in this system/i)).toBeInTheDocument();
    // ...but nothing is handed to the assistant that it cannot answer from.
    expect(selectedStandardNumbers(getSourcesSnapshot())).toEqual([]);
  });

  test("the panel does not claim the assistant can read the document's prose", () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);
    // What is shared is the standards a document cites, not its text.
    expect(screen.getByText(/Indian Standards it cites become part of/i)).toBeInTheDocument();
    expect(screen.getByText(/read for the standards they cite/i)).toBeInTheDocument();
  });
});

describe("WorkspacePanel", () => {
  test("offers exactly the three workspace actions", () => {
    render(<WorkspacePanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    for (const name of ["Audio Overview", "Testings", "Certifications"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // The formats from the earlier design are gone.
    for (const gone of ["Video Overview", "Mind Map", "Reports", "Flashcards", "Quiz", "Infographic", "Data Table"]) {
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

  test("Audio Overview does not pretend to work — there is no speech synthesis here", () => {
    render(<WorkspacePanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    const planned = screen.getAllByText("Planned");
    expect(planned).toHaveLength(1);
    expect(planned[0].closest("button")).toBeDisabled();
    expect(screen.getByText(/Audio Overview is not built yet/i)).toBeInTheDocument();
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
