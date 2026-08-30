import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchOverlay } from "./SearchOverlay";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockClear();
  global.fetch = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("SearchOverlay", () => {
  test("renders nothing when closed", () => {
    render(<SearchOverlay open={false} onClose={() => {}} />);
    expect(screen.queryByPlaceholderText("Search BIS Standards, Services & Documents")).not.toBeInTheDocument();
  });

  test("renders the search input, example, and section shortcut links in the empty state", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    expect(screen.getByPlaceholderText("Search BIS Standards, Services & Documents")).toBeInTheDocument();
    expect(screen.getByText("Try asking")).toBeInTheDocument();
    expect(screen.getByText("Browse by section")).toBeInTheDocument();
    for (const label of ["Standards", "Certification", "Testing", "Search Documents", "Compare"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test("never labels itself as an AI chat interface", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    expect(screen.queryByText(/chat with ai/i)).not.toBeInTheDocument();
  });

  test("submitting a typed query navigates to /search?q=<query> and closes the overlay", () => {
    const onClose = vi.fn();
    render(<SearchOverlay open onClose={onClose} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.change(input, { target: { value: "some random keyword" } });
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).toHaveBeenCalledWith("/search?q=some%20random%20keyword");
    expect(onClose).toHaveBeenCalled();
  });

  test("section shortcut links navigate to their real routes, not submit as search queries", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    const certLink = screen.getByText("Certification").closest("a");
    expect(certLink).toHaveAttribute("href", "/certification");
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("submitting an empty query does not navigate", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("the close button calls onClose", () => {
    const onClose = vi.fn();
    render(<SearchOverlay open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close search"));
    expect(onClose).toHaveBeenCalled();
  });

  test("Escape key calls onClose", () => {
    const onClose = vi.fn();
    render(<SearchOverlay open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("typing an exact standard identifier shows it as an instant deterministic suggestion, without calling the search API", async () => {
    render(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.change(input, { target: { value: "IS 5522:2014" } });

    await waitFor(() => expect(screen.getByText("IS 5522:2014")).toBeInTheDocument());
    expect(screen.getByText("Look up this exact standard")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("typing a non-identifier query debounces a call to the real /api/v1/search endpoint and shows only real returned standards", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { standardNumber: "IS 14543:2016", title: "Packaged Drinking Water", documentId: "doc-1", chunkId: "c1" },
          { standardNumber: "IS 14543:2016", title: "Packaged Drinking Water", documentId: "doc-1", chunkId: "c2" }, // duplicate standard, must be deduped
        ],
      }),
    });
    render(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.change(input, { target: { value: "packaged drinking water" } });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 1000 });
    await waitFor(() => expect(screen.getByText("IS 14543:2016")).toBeInTheDocument());
    // deduped: only one suggestion rendered despite two matching chunks
    expect(screen.getAllByText("IS 14543:2016")).toHaveLength(1);
  });

  test("a query the search API returns nothing for shows an honest no-results hint, never a fabricated suggestion", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    render(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.change(input, { target: { value: "totally nonexistent product xyz" } });

    await waitFor(() => expect(screen.getByText(/No matching BIS standards found/i)).toBeInTheDocument(), { timeout: 1000 });
  });

  test("clicking a suggestion navigates directly to the standard, not a search results page", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ standardNumber: "IS 5522:2014", title: "Stainless Steel Sheets", documentId: "doc-abc", chunkId: "c1" }] }),
    });
    render(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.change(input, { target: { value: "stainless steel" } });

    await waitFor(() => expect(screen.getByText("IS 5522:2014")).toBeInTheDocument(), { timeout: 1000 });
    fireEvent.click(screen.getByText("IS 5522:2014"));
    expect(pushMock).toHaveBeenCalledWith("/standards/doc-abc");
  });

  test("ArrowDown then Enter selects the highlighted suggestion", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ standardNumber: "IS 5522:2014", title: "Stainless Steel Sheets", documentId: "doc-abc", chunkId: "c1" }] }),
    });
    render(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.change(input, { target: { value: "stainless steel" } });
    await waitFor(() => expect(screen.getByText("IS 5522:2014")).toBeInTheDocument(), { timeout: 1000 });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pushMock).toHaveBeenCalledWith("/standards/doc-abc");
  });
});
