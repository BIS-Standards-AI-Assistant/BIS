import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PlaceholderPage } from "./PlaceholderPage";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

// PlaceholderPage renders Header, which renders SearchOverlay
// unconditionally; SearchOverlay calls useRouter() from next/navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderPlaceholder() {
  return render(
    <LanguageProvider>
      <PlaceholderPage
        crumbs={[
          { label: "Certification", href: "/certification" },
          { label: "Hallmarking", href: "/certification/hallmarking" },
        ]}
        title="Hallmarking"
        description="Gold and silver hallmarking under BIS."
      />
    </LanguageProvider>,
  );
}

describe("PlaceholderPage", () => {
  test("renders the breadcrumb trail including Home", () => {
    renderPlaceholder();
    const breadcrumb = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
    expect(breadcrumb.getByText("Home")).toBeInTheDocument();
    expect(breadcrumb.getByText("Certification")).toBeInTheDocument();
    expect(breadcrumb.getByText("Hallmarking")).toBeInTheDocument();
  });

  test("renders the title and description", () => {
    renderPlaceholder();
    expect(screen.getByRole("heading", { name: "Hallmarking" })).toBeInTheDocument();
    expect(screen.getByText("Gold and silver hallmarking under BIS.")).toBeInTheDocument();
  });

  test("honestly labels itself as not-yet-available, never fabricating content", () => {
    renderPlaceholder();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByText(/honest placeholder/i)).toBeInTheDocument();
  });

  test("offers links to the two real, working features", () => {
    renderPlaceholder();
    expect(screen.getByText("Browse Standards").closest("a")).toHaveAttribute("href", "/standards");
    expect(screen.getByText("Ask about a Standard").closest("a")).toHaveAttribute("href", "/");
  });
});
