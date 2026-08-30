import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "./Header";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

// Header renders SearchOverlay unconditionally (it toggles visibility
// internally), and SearchOverlay calls useRouter() from next/navigation,
// which requires an app-router context these unit tests don't provide.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderHeader() {
  return render(
    <LanguageProvider>
      <Header />
    </LanguageProvider>,
  );
}

describe("Header", () => {
  test("renders all 7 top-level navigation items", () => {
    renderHeader();
    for (const label of ["Standards", "Certification", "Testing", "Resources", "e-Services", "About BIS", "Contact Us"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test("Contact Us is a direct link, not a mega-menu trigger", () => {
    renderHeader();
    const contact = screen.getByText("Contact Us").closest("a");
    expect(contact).toHaveAttribute("href", "/contact");
  });

  test("clicking a section with a mega menu opens it and shows its groups", () => {
    renderHeader();
    fireEvent.click(screen.getByText("Certification"));
    expect(screen.getByText("Hallmarking")).toBeInTheDocument();
    expect(screen.getByText("Certification Process")).toBeInTheDocument();
  });

  test("clicking the same section again closes the mega menu", () => {
    renderHeader();
    const trigger = screen.getByText("Certification");
    fireEvent.click(trigger);
    expect(screen.getByText("Hallmarking")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByText("Hallmarking")).not.toBeInTheDocument();
  });

  test("opening a different section closes the previous one", () => {
    renderHeader();
    fireEvent.click(screen.getByText("Certification"));
    expect(screen.getByText("Hallmarking")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Testing"));
    expect(screen.queryByText("Hallmarking")).not.toBeInTheDocument();
    expect(screen.getByText("Laboratory Search")).toBeInTheDocument();
  });

  test("Escape key closes an open mega menu", () => {
    renderHeader();
    fireEvent.click(screen.getByText("Standards"));
    expect(screen.getByText("Browse Standards")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Browse Standards")).not.toBeInTheDocument();
  });

  test("search button opens the search overlay", () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText("Search the site"));
    expect(screen.getByPlaceholderText("Search BIS Standards, Services & Documents")).toBeInTheDocument();
  });

  test("pressing '/' opens the search overlay", () => {
    renderHeader();
    expect(screen.queryByPlaceholderText("Search BIS Standards, Services & Documents")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "/" });
    expect(screen.getByPlaceholderText("Search BIS Standards, Services & Documents")).toBeInTheDocument();
  });

  test("pressing '/' while typing in a text field does not open search (doesn't hijack the character)", () => {
    renderHeader();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "/" });
    expect(screen.queryByPlaceholderText("Search BIS Standards, Services & Documents")).not.toBeInTheDocument();
    document.body.removeChild(input);
  });
});
