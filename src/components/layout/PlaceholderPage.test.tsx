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
    expect(screen.getByText("Not covered by this system yet")).toBeInTheDocument();
    expect(screen.getByText(/honest placeholder/i)).toBeInTheDocument();
  });

  test("offers links to the two real, working features", () => {
    renderPlaceholder();
    expect(screen.getByText("Browse Standards").closest("a")).toHaveAttribute("href", "/standards");
    expect(screen.getByText("Ask about a Standard").closest("a")).toHaveAttribute("href", "/");
  });

  test("renders every verified official source with its host and note", () => {
    render(
      <LanguageProvider>
        <PlaceholderPage
          crumbs={[{ label: "e-Services", href: "/e-services" }]}
          title="Apply for Certification"
          description="Start a certification application."
          links={[
            { label: "Apply for a licence", href: "https://www.bis.gov.in/apply-for-licences/?lang=en" },
            { label: "Manak Online", href: "https://www.manakonline.in", note: "BIS e-services portal." },
          ]}
        />
      </LanguageProvider>,
    );

    const first = screen.getByText("Apply for a licence").closest("a");
    expect(first).toHaveAttribute("href", "https://www.bis.gov.in/apply-for-licences/?lang=en");
    expect(first).toHaveAttribute("target", "_blank");
    expect(first).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByText("Manak Online").closest("a")).toHaveAttribute("href", "https://www.manakonline.in");
    expect(screen.getByText("BIS e-services portal.")).toBeInTheDocument();

    // The destination host is shown so the user knows where they are going.
    expect(screen.getByText("bis.gov.in")).toBeInTheDocument();
    expect(screen.getByText("manakonline.in")).toBeInTheDocument();
  });

  test("without links, says nothing is available rather than inventing a destination", () => {
    renderPlaceholder();
    expect(screen.queryByText("Official BIS sources")).not.toBeInTheDocument();
    expect(screen.getByText(/honest placeholder/i)).toBeInTheDocument();
  });

  test("with links, drops the placeholder wording in favour of the real sources", () => {
    render(
      <LanguageProvider>
        <PlaceholderPage
          crumbs={[{ label: "Certification", href: "/certification" }]}
          title="Fees & Charges"
          description="What BIS certification costs."
          links={[{ label: "Product Certification Fee", href: "https://www.bis.gov.in/x/?lang=en" }]}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("Official BIS sources")).toBeInTheDocument();
    expect(screen.queryByText(/honest placeholder/i)).not.toBeInTheDocument();
  });
});
