import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ComparePage from "./page";

vi.mock("@/components/layout/Header", () => ({ Header: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const findMany = vi.fn();
let dbAvailable = true;
vi.mock("@/db", () => ({
  getDb: () => {
    if (!dbAvailable) throw new Error("DATABASE_URL is not set");
    return { query: { documents: { findMany } } };
  },
}));

const DOC_ID = "3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f";

beforeEach(() => {
  dbAvailable = true;
  findMany.mockReset();
  findMany.mockResolvedValue([]);
});

async function renderCompare(ids: string) {
  render(await ComparePage({ searchParams: Promise.resolve({ ids }) }));
}

// Part numbers are written "IS 13252 (Part 1):2010" once the canonical
// identifier fix lands, "IS 13252 Part 1:2010" before it; either is the
// same standard for these tests.
const headerNumbers = () =>
  within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .slice(1)
    .map((th) => th.querySelector("p")?.textContent?.replace(/\((Part [^)]*)\)/, "$1"));

describe("/compare", () => {
  test("reference standards from the register can be compared, with or without a database", async () => {
    for (const available of [true, false]) {
      dbAvailable = available;
      document.body.innerHTML = "";
      await renderCompare("is-13252-part-1,is-2347");
      expect(screen.queryByText(/knowledge base temporarily unavailable/i)).not.toBeInTheDocument();
      expect(headerNumbers()).toEqual(["IS 13252 Part 1:2010", "IS 2347:2017"]);
    }
  });

  test("reference standards show 0 indexed sections, not their summary passages", async () => {
    await renderCompare("is-13252-part-1,is-14543");
    const row = screen.getByRole("rowheader", { name: "Indexed sections" }).closest("tr")!;
    expect([...row.querySelectorAll("td")].map((td) => td.textContent)).toEqual(["0", "0"]);
  });

  test("register slugs are never sent to the uuid document column", async () => {
    await renderCompare("is-13252-part-1,is-2347");
    expect(findMany).not.toHaveBeenCalled();
  });

  test("ingested documents and reference standards can be mixed, in the order selected", async () => {
    findMany.mockResolvedValue([
      {
        id: DOC_ID,
        standardNumber: "IS 5522:2014",
        title: "Stainless Steel Sheets",
        documentType: "product_manual",
        version: "PM/IS 5522/1",
        publicationDate: "2019-05",
        sourceUrl: "javascript:alert(1)",
        chunks: [{ id: "a" }, { id: "b" }],
      },
    ]);
    await renderCompare(`is-2347,${DOC_ID}`);
    expect(headerNumbers()).toEqual(["IS 2347:2017", "IS 5522:2014"]);
    // A stored non-http(s) URL never becomes a clickable link.
    for (const link of screen.getAllByRole("link", { name: /open document/i })) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });

  test("when ingested documents are requested and the database is down, says so", async () => {
    dbAvailable = false;
    await renderCompare(`${DOC_ID},is-2347`);
    expect(screen.getByText(/knowledge base temporarily unavailable/i)).toBeInTheDocument();
  });

  test("unknown ids are skipped rather than shown as empty columns", async () => {
    await renderCompare("is-2347,nope-123,is-13252-part-1");
    expect(headerNumbers()).toEqual(["IS 2347:2017", "IS 13252 Part 1:2010"]);
  });
});
