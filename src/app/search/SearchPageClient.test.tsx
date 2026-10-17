import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPageClient } from "./SearchPageClient";

vi.mock("@/components/layout/Header", () => ({ Header: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/query/VoiceInputButton", () => ({ VoiceInputButton: () => null }));

function searchResponse(results: unknown[] = []) {
  return { ok: true, status: 200, json: async () => ({ results }) } as unknown as Response;
}

const hit = {
  chunkId: "c1",
  documentId: "d1",
  standardNumber: "IS 5522:2014",
  title: "Stainless steel sheets for utensils",
  section: null,
  clause: null,
  page: 3,
  text: "Stainless steel for utensils shall conform to…",
  sourceUrl: null,
};

beforeEach(() => {
  window.history.replaceState(null, "", "/search");
  global.fetch = vi.fn(async () => searchResponse()) as unknown as typeof fetch;
});

afterEach(() => vi.restoreAllMocks());

describe("SearchPageClient: the URL follows the search", () => {
  test("submitting a search writes it to ?q= so a reload or shared link reopens it", async () => {
    const user = userEvent.setup();
    render(<SearchPageClient initialQuery="" />);

    await user.type(screen.getByRole("searchbox"), "  stainless steel utensils ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(window.location.pathname).toBe("/search");
    expect(new URLSearchParams(window.location.search).get("q")).toBe("stainless steel utensils");
  });

  test("special characters are encoded", async () => {
    const user = userEvent.setup();
    render(<SearchPageClient initialQuery="" />);

    await user.type(screen.getByRole("searchbox"), "IS 302 (Part 2/Sec 6) & cables");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(new URLSearchParams(window.location.search).get("q")).toBe("IS 302 (Part 2/Sec 6) & cables");
  });

  test("does not add a history entry per search", async () => {
    const user = userEvent.setup();
    const before = window.history.length;
    render(<SearchPageClient initialQuery="" />);

    await user.type(screen.getByRole("searchbox"), "cement");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(window.history.length).toBe(before);
  });

  test("an initial ?q= search runs once and posts the trimmed query", async () => {
    window.history.replaceState(null, "", "/search?q=IS%205522");
    global.fetch = vi.fn(async () => searchResponse([hit])) as unknown as typeof fetch;
    render(<SearchPageClient initialQuery="IS 5522" />);

    await screen.findByText("1 result found");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ query: "IS 5522" });
  });
});

describe("SearchPageClient: empty-result tips describe the searched query", () => {
  test("tips stay for the query that was searched while the user edits the box", async () => {
    const user = userEvent.setup();
    render(<SearchPageClient initialQuery="IS 99999" />);

    await screen.findByText("No matching standards found");
    expect(screen.getByText(/Check the standard number format/)).toBeInTheDocument();

    // Editing the box must not rewrite advice about results already shown.
    const input = screen.getByRole("searchbox");
    await user.clear(input);
    await user.type(input, "cement");
    expect(screen.getByText(/Check the standard number format/)).toBeInTheDocument();
    expect(screen.queryByText(/more specific product/)).not.toBeInTheDocument();
  });

  test("a product query gets product tips", async () => {
    render(<SearchPageClient initialQuery="widgets" />);
    await screen.findByText("No matching standards found");
    expect(screen.getByText(/more specific product or material name/)).toBeInTheDocument();
  });
});

describe("SearchPageClient: failure", () => {
  test("a failed request shows an error, not an empty result", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response) as unknown as typeof fetch;
    render(<SearchPageClient initialQuery="cement" />);

    await waitFor(() => expect(screen.getByText("Search error")).toBeInTheDocument());
    expect(screen.getByText("We couldn't retrieve relevant BIS sources.")).toBeInTheDocument();
    expect(screen.queryByText("No matching standards found")).not.toBeInTheDocument();
  });
});
