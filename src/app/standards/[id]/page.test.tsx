import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import StandardDetailPage from "./page";

// The page is an async server component: await it, then render the JSX.
// Header/Footer need the language provider and are irrelevant here.
vi.mock("@/components/layout/Header", () => ({ Header: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
// By default there is no database: every lookup falls through to the
// shipped reference datasets, which is the path these pages actually take
// for QCO standards. A test can supply one ingested document instead.
const db = vi.hoisted(() => ({ document: null as Record<string, unknown> | null }));
vi.mock("@/db", () => ({
  getDb: () => {
    if (!db.document) throw new Error("no database in tests");
    return { query: { documents: { findFirst: async () => db.document } } };
  },
}));
afterEach(() => {
  db.document = null;
});

/**
 * An ingested document whose number is in no reference dataset, so it has
 * no scheme record. A seed-corpus edition can't serve here: every one of
 * them matches some edition the reference dataset has held.
 */
const UNLISTED_DOC_ID = "3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f";
function useUnlistedDocument() {
  db.document = {
    id: UNLISTED_DOC_ID,
    standardNumber: "IS 99002:2020",
    title: "An ingested document with no scheme record",
    documentType: "standard",
    sourceUrl: "https://www.bis.gov.in/some-document",
    sourceOrg: "BIS",
    version: "2020",
    publicationDate: null,
    retrievedAt: new Date("2026-08-01T00:00:00Z"),
    checksum: "abc",
    createdAt: new Date("2026-08-02T00:00:00Z"),
    chunks: [],
  };
}

async function renderPage(id: string) {
  render(await StandardDetailPage({ params: Promise.resolve({ id }) }));
}

describe("/standards/[id] — certification facts come from the record", () => {
  test("a part-numbered CRS standard shows its own scheme and mandatory status", async () => {
    await renderPage("is-13252-part-1");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("IS 13252 (Part 1):2010");
    expect(screen.getAllByText("Scheme-II (CRS)").length).toBeGreaterThan(0);
    expect(screen.getByText("Compulsory / QCO")).toBeInTheDocument();
    expect(screen.getByText("Mandatory Quality Control Order (QCO)")).toBeInTheDocument();
    // Regression: it used to miss its scheme and claim the opposite.
    expect(screen.queryByText("Scheme-I (ISI)")).not.toBeInTheDocument();
    expect(screen.queryByText("Voluntary Reference")).not.toBeInTheDocument();
  });

  test("a part-and-section-numbered standard also finds its scheme", async () => {
    // Not the induction-cooker record: its "Sec 26" is a documented error
    // in the dataset (Sec 26 is clocks; see the dataset README).
    await renderPage("is-302-part-2-sec-3");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("IS 302 (Part 2/Sec 3):2007");
    expect(screen.getByText("Compulsory / QCO")).toBeInTheDocument();
  });

  test("with no scheme record, nothing is claimed: not verified, not voluntary, no invented scheme", async () => {
    useUnlistedDocument();
    await renderPage(UNLISTED_DOC_ID);
    expect(screen.getByText("Certification status not verified")).toBeInTheDocument();
    expect(screen.getAllByText("Not verified").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Information not verified from the available sources")).toBeInTheDocument();
    for (const fabricated of ["Verified Record", "Scheme-I (ISI)", "Voluntary Reference", "Voluntary Standard Reference"]) {
      expect(screen.queryByText(fabricated)).not.toBeInTheDocument();
    }
  });

  test("the record-integrity note does not claim everything comes from gazette releases", async () => {
    useUnlistedDocument();
    await renderPage(UNLISTED_DOC_ID);
    expect(screen.queryByText(/directly referenced\s+from official Bureau of Indian Standards gazette releases/)).not.toBeInTheDocument();
    expect(screen.getByText(/marked as not verified rather than filled in/)).toBeInTheDocument();
  });

  test("an unknown standard is a 404", async () => {
    await expect(StandardDetailPage({ params: Promise.resolve({ id: "nope-123" }) })).rejects.toThrow();
  });
});
