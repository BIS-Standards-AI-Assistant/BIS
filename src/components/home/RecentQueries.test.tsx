import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecentQueries } from "./RecentQueries";
import { addRecentQuery, clearRecentQueries } from "@/lib/recent-queries";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { DICTIONARIES } from "@/lib/i18n";

beforeEach(() => {
  localStorage.clear();
  clearRecentQueries();
});

function renderList(onRerun = vi.fn()) {
  render(
    <LanguageProvider>
      <RecentQueries onRerun={onRerun} />
    </LanguageProvider>,
  );
  return onRerun;
}

// The table (desktop) and the list (mobile) both render in jsdom.
const queryButtons = (name: string) => screen.getAllByRole("button", { name });

describe("RecentQueries — before any history", () => {
  test("is headed as examples, not as recent queries", () => {
    renderList();
    expect(screen.getByRole("heading", { name: "Example Searches" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Recent/ })).not.toBeInTheDocument();
  });

  test("lists no standards for the examples — those only come from running a search", () => {
    renderList();
    expect(screen.queryByText(/^IS \d/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Run to see sourced results").length).toBeGreaterThan(0);
  });

  test("an example can be run from the keyboard", async () => {
    const onRerun = renderList();
    const [button] = queryButtons("Packaged drinking water");
    button.focus();
    await userEvent.setup().keyboard("{Enter}");
    expect(onRerun).toHaveBeenCalledWith("Packaged drinking water");
  });

  test("offers no history to clear", () => {
    renderList();
    expect(screen.queryByRole("button", { name: "Clear history" })).not.toBeInTheDocument();
  });
});

describe("RecentQueries — with history", () => {
  beforeEach(() => {
    addRecentQuery({ query: "steel water bottle", standardNumbers: ["IS 14543:2016"], confidence: "high", timestamp: Date.now() });
  });

  test("is headed as recent searches and shows the standards that search found", () => {
    renderList();
    expect(screen.getByRole("heading", { name: "Recent Searches" })).toBeInTheDocument();
    expect(screen.getAllByText("IS 14543:2016").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Just now").length).toBeGreaterThan(0);
  });

  test("clicking a row reruns it once", async () => {
    const onRerun = renderList();
    await userEvent.setup().click(queryButtons("steel water bottle")[0]);
    expect(onRerun).toHaveBeenCalledTimes(1);
    expect(onRerun).toHaveBeenCalledWith("steel water bottle");
  });

  test("history can be cleared, which brings the examples back", async () => {
    renderList();
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear history" }));
    expect(screen.getByRole("heading", { name: "Example Searches" })).toBeInTheDocument();
  });
});

describe("RecentQueries — headings in every language", () => {
  test("in Hindi, real history is headed as recent searches, not examples", () => {
    localStorage.setItem("bis-lang", "hi");
    addRecentQuery({ query: "हेलमेट", standardNumbers: [], confidence: "none", timestamp: Date.now() });
    renderList();
    expect(screen.getByRole("heading", { name: "हाल की खोजें" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "उदाहरण खोजें" })).not.toBeInTheDocument();
  });

  test("every language heads examples and history differently", () => {
    for (const [lang, dict] of Object.entries(DICTIONARIES)) {
      expect(dict.recent.headingHistory, lang).not.toBe(dict.recent.heading);
    }
  });
});
