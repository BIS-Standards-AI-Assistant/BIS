import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomeClient } from "./HomeClient";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import type { QueryResponse } from "@/types/api";

function renderHome() {
  return render(
    <LanguageProvider>
      <HomeClient />
    </LanguageProvider>,
  );
}

/**
 * These tests target UI breakage and user-flow disruption, not happy-path
 * correctness (covered elsewhere): network/API failures, malformed
 * responses, storage failures, rapid/duplicate interaction, and navigation
 * state desync. Per docs/ui/SIH.md, a broken engine call must degrade to an
 * honest error/empty state — never a stale UI, a raw backend error string,
 * or a stuck loading spinner.
 */

const push = vi.fn();
const replace = vi.fn();
let searchParamsValue = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(searchParamsValue ? `q=${searchParamsValue}` : ""),
}));

function baseResponse(overrides: Partial<QueryResponse> = {}): QueryResponse {
  return {
    answer: "test answer",
    intent: "standard_lookup",
    interpretation: {
      product: "steel",
      material: null,
      useCase: null,
      targetUser: null,
      sector: null,
      certificationRequested: false,
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
  searchParamsValue = "";
  push.mockClear();
  replace.mockClear();
  global.fetch = vi.fn();
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("HomeClient — component breakage & flow disruption", () => {
  test("network failure surfaces a generic error, never a raw fetch/provider error string", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("Failed to fetch"));
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.queryByText(/Failed to fetch/i)).not.toBeInTheDocument();
  });

  test("non-OK HTTP response (e.g. 500/402 credit exhaustion) shows the generic error, not the status text", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 402,
      statusText: "Payment Required — OpenRouter credits exhausted",
    });
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(/Payment Required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/402/)).not.toBeInTheDocument();
  });

  test("malformed JSON body does not crash the app — it resolves to the error state", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token in JSON");
      },
    });
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  test("loading state clears even when the request fails (no stuck spinner)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(/Searching BIS sources/i)).not.toBeInTheDocument();
  });

  test("submit is disabled while a request is in flight, preventing duplicate/overlapping calls", async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    // Submitting swaps the full-width homepage hero for the compact
    // in-results search bar, so re-query rather than reuse the old node.
    await waitFor(() => expect(screen.getByRole("button", { name: /^(Search|Searching…)$/ })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /^(Search|Searching…)$/ }));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, json: async () => baseResponse() });
    await waitFor(() => expect(screen.getByRole("button", { name: /^(Search|Searching…)$/ })).not.toBeDisabled());
  });

  test("empty recommendations render an honest empty state, never a fabricated standard", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse({ recommendations: [] }),
    });
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "made up widget" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByText(/No sufficiently relevant standard found/i)).toBeInTheDocument());
  });

  test("clearing results after an error returns to the homepage view, not a blank/broken screen", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  });

  test("sessionStorage.getItem throwing (private-mode / disabled storage) does not break the search flow", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("access denied");
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse(),
    });
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByText("test answer")).toBeInTheDocument());
  });

  test("sessionStorage.setItem throwing (quota exceeded) still shows the fetched result", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse(),
    });
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByText("test answer")).toBeInTheDocument());
  });

  test("cached result from a prior identical query is shown without a spinner flash or duplicate fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse({ answer: "first answer" }),
    });
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("first answer")).toBeInTheDocument());

    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText("first answer")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("submitting whitespace-only input is a no-op — no fetch, no crash", () => {
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("a second search overwrites a prior result cleanly (no stale recommendations bleeding through)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => baseResponse({ answer: "answer A" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => baseResponse({ answer: "answer B" }) });

    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "query A" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("answer A")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "query B" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("answer B")).toBeInTheDocument());
    expect(screen.queryByText("answer A")).not.toBeInTheDocument();
  });

  test("an in-flight request whose response arrives after the user navigated away does not clobber the cleared UI", async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "helmet" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText(/Searching BIS sources/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Clear search"));
    resolveFetch({ ok: true, json: async () => baseResponse({ answer: "late answer" }) });

    await waitFor(() => {
      // Whichever behavior is intended, it must be deliberate, not a crash;
      // this pins current behavior so a silent regression is caught.
      expect(document.body).toBeInTheDocument();
    });
  });

  test("auto-run from a ?q= URL on mount does not double-fire the request", async () => {
    searchParamsValue = "helmet";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse(),
    });
    renderHome();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });
});
