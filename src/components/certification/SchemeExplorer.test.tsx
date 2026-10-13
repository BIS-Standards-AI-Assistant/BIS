import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SchemeExplorer, SEARCH_DEBOUNCE_MS } from "./SchemeExplorer";

const mockItem = {
  standardNumber: "IS 5522:2014",
  title: "Stainless Steel Sheets and Strips for Utensils",
  category: "Metals",
  scheme: "Scheme-I (ISI)",
  mandatoryQco: true,
  scopeSummary: "Requirements for stainless steel sheets.",
  certificationRoute: "Mandatory Scheme-I",
  testingParameters: ["Chemical composition"],
  verificationStatus: "verified_accurate",
  sourceUrl: "https://bis.gov.in/example.pdf",
};

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("SchemeExplorer", () => {
  test("renders results returned by the API, labeled as a reference set not a comprehensive list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [mockItem], total: 1, sectors: ["Metals"] }),
    });
    render(<SchemeExplorer />);
    await waitFor(() => expect(screen.getByText("IS 5522:2014")).toBeInTheDocument());
    expect(screen.getByText(/not an exhaustive list/i)).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  test("labels a needs_review entry distinctly from a verified one, never with the same trust-implying style", async () => {
    const needsReviewItem = { ...mockItem, standardNumber: "IS 9873 (Part 1):2019", verificationStatus: "needs_review" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [needsReviewItem], total: 1, sectors: ["Metals"] }),
    });
    render(<SchemeExplorer />);
    await waitFor(() => expect(screen.getByText("IS 9873 (Part 1):2019")).toBeInTheDocument());
    const badge = screen.getByText("Needs review");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("warning");
    expect(badge.className).not.toContain("success");
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  test("shows an honest empty state when nothing matches — never fabricates a result", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, sectors: [] }),
    });
    render(<SchemeExplorer />);
    await waitFor(() => expect(screen.getByText(/No matching entries/i)).toBeInTheDocument());
    expect(screen.getByText(/doesn't mean no BIS certification applies/i)).toBeInTheDocument();
  });

  test("shows an error state (not a silent empty result) when the API call fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    render(<SchemeExplorer />);
    await waitFor(() => expect(screen.getByText(/Couldn't load the reference dataset/i)).toBeInTheDocument());
  });

  test("typing searches once after a pause, not once per keystroke", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [], total: 0, datasetSize: 100, sectors: [] }) });
      render(<SchemeExplorer />);
      await act(async () => {}); // the initial, unfiltered load
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const box = screen.getByLabelText("Search certification schemes");
      for (const value of ["s", "st", "ste", "stee", "steel"]) {
        fireEvent.change(box, { target: { value } });
        await act(async () => {
          vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS / 3);
        });
      }
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(String(fetchMock.mock.calls[1][0])).toContain("q=steel");
    } finally {
      vi.useRealTimers();
    }
  });

  test("states the dataset's real size from the API, not a hard-coded count", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [mockItem], total: 1, datasetSize: 100, sectors: ["Metals"] }),
    });
    render(<SchemeExplorer />);
    expect(await screen.findByText(/a reference set of 100 entries/i)).toBeInTheDocument();
    expect(screen.queryByText(/22 entries|22-entry/)).not.toBeInTheDocument();
    expect(screen.queryByText(/fact-checked/i)).not.toBeInTheDocument();
  });

  test("a standard listed twice in the dataset renders twice, without a duplicate-key warning", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [mockItem, { ...mockItem, title: "Second entry" }], total: 2, datasetSize: 2, sectors: [] }),
    });
    render(<SchemeExplorer />);
    await screen.findByText("Second entry");
    expect(screen.getAllByText("IS 5522:2014")).toHaveLength(2);
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/same key/i);
  });
});
