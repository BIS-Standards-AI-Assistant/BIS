import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StandardDetailPage from "./page";

// The page is an async server component: await it, then render the JSX.
// Header/Footer need the language provider and are irrelevant here.
vi.mock("@/components/layout/Header", () => ({ Header: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
// No database in unit tests: every lookup falls through to the shipped
// reference datasets, which is the path these pages actually take for
// QCO standards.
vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("no database in tests");
  },
}));

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
    await renderPage("is-302-part-2-sec-26");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("IS 302 (Part 2/Sec 26):2014");
    expect(screen.getByText("Compulsory / QCO")).toBeInTheDocument();
  });

  test("with no scheme record, nothing is claimed: not verified, not voluntary, no invented scheme", async () => {
    // The seed corpus holds the 2016 edition; the reference dataset only the 2024 one.
    await renderPage("is-14543-2016");
    expect(screen.getByText("Certification status not verified")).toBeInTheDocument();
    expect(screen.getAllByText("Not verified").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Information not verified from the available sources")).toBeInTheDocument();
    for (const fabricated of ["Verified Record", "Scheme-I (ISI)", "Voluntary Reference", "Voluntary Standard Reference"]) {
      expect(screen.queryByText(fabricated)).not.toBeInTheDocument();
    }
  });

  test("the record-integrity note does not claim everything comes from gazette releases", async () => {
    await renderPage("is-14543-2016");
    expect(screen.queryByText(/directly referenced\s+from official Bureau of Indian Standards gazette releases/)).not.toBeInTheDocument();
    expect(screen.getByText(/marked as not verified rather than filled in/)).toBeInTheDocument();
  });

  test("a reference-dataset record does not claim its full text is indexed", async () => {
    await renderPage("is-13252-part-1");
    expect(screen.getByText(/Reference Record · Document Full Text Not Indexed/)).toBeInTheDocument();
    expect(screen.queryByText(/Full-Text Evidence Indexed/)).not.toBeInTheDocument();
    expect(screen.getByText(/Reference Summar(y|ies)$/)).toBeInTheDocument();
  });

  test("a seed-corpus document with real text is shown as indexed", async () => {
    await renderPage("is-14543-2016");
    expect(screen.getByText(/Full-Text Evidence Indexed \(\d+ Passages\)/)).toBeInTheDocument();
  });

  test("an unknown standard is a 404", async () => {
    await expect(StandardDetailPage({ params: Promise.resolve({ id: "nope-123" }) })).rejects.toThrow();
  });
});
