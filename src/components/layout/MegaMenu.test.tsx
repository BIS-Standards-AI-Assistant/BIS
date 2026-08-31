import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MegaMenu } from "./MegaMenu";
import { CERTIFICATION_SECTION, STANDARDS_SECTION } from "@/lib/navigation";

describe("MegaMenu", () => {
  test("renders every group title and item label for the given section", () => {
    render(<MegaMenu section={CERTIFICATION_SECTION} id="megamenu-certification" />);
    for (const group of CERTIFICATION_SECTION.groups) {
      expect(screen.getByText(group.title)).toBeInTheDocument();
      for (const item of group.items) {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      }
    }
  });

  test("renders the section's CTA when present", () => {
    render(<MegaMenu section={CERTIFICATION_SECTION} id="megamenu-certification" />);
    expect(screen.getByText(CERTIFICATION_SECTION.cta!.heading)).toBeInTheDocument();
    expect(screen.getByText(CERTIFICATION_SECTION.cta!.ctaLabel)).toBeInTheDocument();
  });

  test("marks real (non-placeholder) items with a Live badge", () => {
    render(<MegaMenu section={STANDARDS_SECTION} id="megamenu-standards" />);
    const browseLink = screen.getByText("Browse Standards").closest("a")!;
    expect(browseLink).toHaveAttribute("href", "/standards");
    expect(browseLink.textContent).toContain("Live");
  });

  test("placeholder items link under the section's root href, not to a real feature", () => {
    render(<MegaMenu section={CERTIFICATION_SECTION} id="megamenu-certification" />);
    const hallmarking = screen.getByText("Hallmarking").closest("a")!;
    expect(hallmarking).toHaveAttribute("href", "/certification/hallmarking");
  });

  test("Standards placeholder items link under /standards/explore, not /standards", () => {
    // Regression test: /standards/[id] already occupies a single dynamic
    // segment for real standard detail pages, so Standards is the one
    // section whose placeholder pages live under a different base path.
    // This previously linked to /standards/explorer, which 404'd because
    // it matched the detail route instead.
    render(<MegaMenu section={STANDARDS_SECTION} id="megamenu-standards" />);
    const explorer = screen.getByText("Standard Explorer").closest("a")!;
    expect(explorer).toHaveAttribute("href", "/standards/explore/explorer");
    const byProduct = screen.getByText("Standards by Product").closest("a")!;
    expect(byProduct).toHaveAttribute("href", "/standards/explore/by-product");
  });
});
