import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandardsListClient, type StandardSummary } from "./StandardsListClient";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const STANDARDS: StandardSummary[] = [
  { id: "is-14543", standardNumber: "IS 14543:2016", title: "Packaged Drinking Water", documentType: "Scheme-I (ISI) · Packaged Water & Beverages", version: "Mandatory QCO (Active)", chunkCount: 0 },
  { id: "is-302-part-2-sec-6", standardNumber: "IS 302 (Part 2/Sec 6):2009", title: "Stationary Cooking Ranges", documentType: "Scheme-I (ISI) · Electrical Appliances", version: null, chunkCount: 0 },
  { id: "is-1293", standardNumber: "IS 1293:2019", title: "Plugs and Socket-Outlets", documentType: "Scheme-I (ISI) · Electrical Accessories", version: null, chunkCount: 0 },
  { id: "doc-5522", standardNumber: "IS 5522:2014", title: "Stainless Steel Sheets and Strips for Utensils", documentType: "product_manual", version: "PM/IS 5522/1", chunkCount: 14 },
];

beforeEach(() => push.mockReset());

const rows = () => screen.queryAllByRole("checkbox");

describe("StandardsListClient", () => {
  test("lists every standard with a count", () => {
    render(<StandardsListClient standards={STANDARDS} />);
    expect(rows()).toHaveLength(4);
    expect(screen.getByText("4 standards")).toBeInTheDocument();
  });

  test("search matches number, title or category, case-insensitively", async () => {
    render(<StandardsListClient standards={STANDARDS} />);
    const search = screen.getByLabelText("Search standards");
    const user = userEvent.setup();

    await user.type(search, "is 1293");
    expect(rows()).toHaveLength(1);
    expect(screen.getByText("1 of 4 standards")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "DRINKING");
    expect(screen.getByText("Packaged Drinking Water")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "beverages");
    expect(rows()).toHaveLength(1);
  });

  test("granular categories collapse into one filter chip", async () => {
    render(<StandardsListClient standards={STANDARDS} />);
    // "Electrical Appliances" and "Electrical Accessories" both map to "Electrical".
    const chip = screen.getByRole("button", { name: "Electrical" });
    expect(screen.queryByRole("button", { name: "Electrical Appliances" })).not.toBeInTheDocument();
    await userEvent.setup().click(chip);
    expect(rows()).toHaveLength(2);
  });

  test("an empty result explains itself and can be cleared", async () => {
    render(<StandardsListClient standards={STANDARDS} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Search standards"), "zzz");
    expect(screen.getByText(/No standards match/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(rows()).toHaveLength(4);
  });

  test("comparing needs two selections and goes to /compare with their ids", async () => {
    render(<StandardsListClient standards={STANDARDS} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: /IS 14543:2016/ }));
    expect(screen.getByText("Select at least 2 standards to compare.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /compare/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /IS 1293:2019/ }));
    await user.click(screen.getByRole("button", { name: "Compare selected (2)" }));
    expect(push).toHaveBeenCalledWith("/compare?ids=is-14543,is-1293");
  });

  test("selection can be cleared", async () => {
    render(<StandardsListClient standards={STANDARDS} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /IS 14543:2016/ }));
    await user.click(screen.getByRole("checkbox", { name: /IS 1293:2019/ }));
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(rows().every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });

  test("index coverage is stated honestly per row", () => {
    render(<StandardsListClient standards={STANDARDS} />);
    expect(screen.getAllByText(/not yet ingested into the retrieval index/)).toHaveLength(3);
    expect(screen.getByText(/14 indexed sections/)).toBeInTheDocument();
  });

  test("each title links to its standard page", () => {
    render(<StandardsListClient standards={STANDARDS} />);
    expect(screen.getByRole("link", { name: "Plugs and Socket-Outlets" })).toHaveAttribute("href", "/standards/is-1293");
  });
});
