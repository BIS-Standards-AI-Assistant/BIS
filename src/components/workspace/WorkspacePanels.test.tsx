import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesPanel } from "./SourcesPanel";
import { StudioPanel } from "./StudioPanel";
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

beforeEach(() => {
  localStorage.clear();
});

describe("SourcesPanel", () => {
  test("lists official BIS sources with a checkable host, never an invented count", () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);

    expect(screen.getByText("BIS Official Website")).toBeInTheDocument();
    expect(screen.getByText("bis.gov.in")).toBeInTheDocument();

    // The mock this was built from showed figures like "1,245 standards" and
    // "18,765 notifications". This app does not hold those numbers, so no
    // row may carry a count-shaped subtitle.
    const panel = screen.getByRole("complementary");
    expect(panel.textContent).not.toMatch(/\d[\d,]{2,}\s+(standards|orders|notifications)/i);
  });

  test("every source links to where BIS actually publishes it", () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(8);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute("target", "_blank");
    }
  });

  test("says plainly that selecting sources does not narrow retrieval yet", () => {
    render(<SourcesPanel onCollapse={vi.fn()} />);
    expect(screen.getByText(/does not yet narrow retrieval/i)).toBeInTheDocument();
  });

  test("selection toggles, and the count follows it", async () => {
    const user = userEvent.setup();
    render(<SourcesPanel onCollapse={vi.fn()} />);

    expect(screen.getByText("8 of 8 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /BIS Official Website/ }));
    expect(screen.getByText("7 of 8 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByText("8 of 8 selected")).toBeInTheDocument();
  });

  test("shows what the search was understood as, once there is a result", () => {
    const { rerender } = render(<SourcesPanel onCollapse={vi.fn()} />);
    expect(screen.queryByText(/Search Context/i)).not.toBeInTheDocument();

    rerender(<SourcesPanel interpretation={INTERPRETATION} onCollapse={vi.fn()} />);
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

describe("StudioPanel", () => {
  test("offers the output formats from the design", () => {
    render(<StudioPanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    for (const name of ["Video Overview", "Mind Map", "Reports", "Flashcards", "Quiz", "Infographic", "Data Table"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  test("none of them pretend to work — each is disabled and labelled Planned", () => {
    render(<StudioPanel onRerun={vi.fn()} onCollapse={vi.fn()} />);

    const planned = screen.getAllByText("Planned");
    expect(planned).toHaveLength(7);
    for (const label of planned) {
      expect(label.closest("button")).toBeDisabled();
    }
    expect(screen.getByText(/not built yet/i)).toBeInTheDocument();
  });

  test("shows real search history, not invented notebooks", async () => {
    localStorage.setItem(
      "bis-recent-queries",
      JSON.stringify([
        { query: "Domestic pressure cooker", standardNumbers: ["IS 2347:2017"], confidence: "high", timestamp: Date.now() },
      ]),
    );

    const onRerun = vi.fn();
    render(<StudioPanel onRerun={onRerun} onCollapse={vi.fn()} />);

    const entry = screen.getByText("Domestic pressure cooker");
    expect(entry).toBeInTheDocument();
    expect(screen.getByText(/1 standard$/)).toBeInTheDocument();

    await userEvent.setup().click(entry);
    expect(onRerun).toHaveBeenCalledWith("Domestic pressure cooker");
  });

  test("says the history is empty rather than showing placeholder entries", () => {
    render(<StudioPanel onRerun={vi.fn()} onCollapse={vi.fn()} />);
    const recent = screen.getByText(/Recent searches/i).closest("div");
    expect(within(recent as HTMLElement).getByText(/Nothing yet/i)).toBeInTheDocument();
  });

  test("collapses on request", async () => {
    const onCollapse = vi.fn();
    render(<StudioPanel onRerun={vi.fn()} onCollapse={onCollapse} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /collapse studio panel/i }));
    expect(onCollapse).toHaveBeenCalled();
  });
});
