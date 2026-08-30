import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CertificationDiscovery } from "./CertificationDiscovery";
import type { QueryResponse } from "@/types/api";

function baseResponse(overrides: Partial<QueryResponse> = {}): QueryResponse {
  return {
    answer: "test answer",
    intent: "certification_process",
    interpretation: {
      product: "steel",
      material: null,
      useCase: null,
      targetUser: null,
      sector: null,
      certificationRequested: true,
      testingRequested: false,
    },
    recommendations: [],
    certification: { available: false, notes: null },
    testing: { available: false, notes: null },
    nextSteps: [],
    confidence: "none",
    engineConfidence: { score: 0, band: "none", groundingState: "insufficient_evidence", supportingSignals: [], limitingSignals: [] },
    conflicts: [],
    limitations: [],
    ...overrides,
  };
}

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("CertificationDiscovery", () => {
  test("submits the query wrapped as a certification question to the real engine endpoint", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse(),
    });
    render(<CertificationDiscovery />);
    fireEvent.change(screen.getByPlaceholderText(/Tell us what you manufacture/i), { target: { value: "steel product" } });
    fireEvent.click(screen.getByText("Find certification"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.query).toBe("What certification do I need for steel product?");
  });

  test("insufficient evidence produces an honest abstention state, not a fabricated recommendation", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse({ recommendations: [] }),
    });
    render(<CertificationDiscovery />);
    fireEvent.change(screen.getByPlaceholderText(/Tell us what you manufacture/i), { target: { value: "unknown widget" } });
    fireEvent.click(screen.getByText("Find certification"));

    await waitFor(() => expect(screen.getByText(/Insufficient evidence/i)).toBeInTheDocument());
  });

  test("a failed request shows a generic error, never a raw backend/provider error string", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    render(<CertificationDiscovery />);
    fireEvent.change(screen.getByPlaceholderText(/Tell us what you manufacture/i), { target: { value: "steel" } });
    fireEvent.click(screen.getByText("Find certification"));

    await waitFor(() => expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument());
  });

  test("clicking an example both fills and submits the query", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse(),
    });
    render(<CertificationDiscovery />);
    fireEvent.click(screen.getByText("packaged drinking water"));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  test("certification.available renders via InfoCard when the engine actually returns notes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse({ certification: { available: true, notes: "Mandatory Scheme-I certification applies." } }),
    });
    render(<CertificationDiscovery />);
    fireEvent.change(screen.getByPlaceholderText(/Tell us what you manufacture/i), { target: { value: "steel" } });
    fireEvent.click(screen.getByText("Find certification"));
    await waitFor(() => expect(screen.getByText("Mandatory Scheme-I certification applies.")).toBeInTheDocument());
  });
});
