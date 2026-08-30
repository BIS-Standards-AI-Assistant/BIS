import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SchemeExplorer } from "./SchemeExplorer";

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
});
