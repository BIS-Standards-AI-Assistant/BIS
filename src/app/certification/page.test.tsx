import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CertificationPage from "./page";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items: [], total: 0, sectors: [] }),
  });
});

function renderPage() {
  return render(
    <LanguageProvider>
      <CertificationPage />
    </LanguageProvider>,
  );
}

describe("Certification page", () => {
  test("no longer shows the 'Coming soon' placeholder", () => {
    renderPage();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  test("renders the real hero headline and the discovery + explorer sections", () => {
    renderPage();
    expect(screen.getByText("Understand the BIS certification pathway")).toBeInTheDocument();
    expect(screen.getAllByText("Find a certification scheme").length).toBeGreaterThan(0);
    expect(screen.getByText("Certification schemes")).toBeInTheDocument();
    expect(screen.getByText("Certification process")).toBeInTheDocument();
  });

  test("clearly distinguishes official BIS services from BIS Navigator's own information", () => {
    renderPage();
    expect(screen.getByText(/does not process applications, payments, or issue/i)).toBeInTheDocument();
  });

  test("preserves the existing header navigation", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toHaveTextContent("Certification");
    expect(nav).toHaveTextContent("Standards");
    expect(nav).toHaveTextContent("Testing");
  });
});
