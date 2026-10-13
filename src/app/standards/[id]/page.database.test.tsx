import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StandardDetailPage from "./page";

vi.mock("@/components/layout/Header", () => ({ Header: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));

const DOC_ID = "3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f";

// An ingested document with no recorded edition and no source URL — the
// case where the page used to fill the gaps with invented facts.
vi.mock("@/db", () => ({
  getDb: () => ({
    query: {
      documents: {
        findFirst: async () => ({
          id: DOC_ID,
          standardNumber: "IS 99001:2020",
          title: "An ingested document",
          documentType: "standard",
          sourceUrl: null,
          sourceOrg: "BIS",
          version: null,
          publicationDate: null,
          retrievedAt: new Date("2026-08-01T00:00:00Z"),
          checksum: "abc",
          createdAt: new Date("2026-08-02T00:00:00Z"),
          chunks: [],
        }),
      },
    },
  }),
}));

async function renderPage() {
  render(await StandardDetailPage({ params: Promise.resolve({ id: DOC_ID }) }));
}

describe("/standards/[id] — a database record with gaps", () => {
  test("a missing edition reads 'Not verified', not 'Gazetted'", async () => {
    await renderPage();
    const editionLabel = screen.getByText("Edition Year");
    expect(editionLabel.nextElementSibling).toHaveTextContent("Not verified");
    expect(screen.queryByText("Gazetted")).not.toBeInTheDocument();
  });

  test("the source link is not presented as an official Gazette link", async () => {
    await renderPage();
    expect(screen.queryByText(/Official Gazette Link/)).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Open source page/ });
    // With no recorded source, this is the BIS compulsory-certification list.
    expect(link.getAttribute("href")).toMatch(/^https:\/\/www\.bis\.gov\.in\//);
    expect(link).toHaveAccessibleName(/opens in a new tab/);
  });
});
