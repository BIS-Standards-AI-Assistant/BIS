import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickLinks } from "./QuickLinks";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

function renderLinks() {
  render(
    <LanguageProvider>
      <QuickLinks />
    </LanguageProvider>,
  );
  return screen.getAllByRole("link");
}

test("BIS pages open in English, matching the English link labels", () => {
  for (const link of renderLinks()) {
    const url = new URL(link.getAttribute("href")!);
    if (url.hostname.endsWith("bis.gov.in") && url.searchParams.has("lang")) {
      expect(url.searchParams.get("lang"), link.textContent ?? "").toBe("en");
    }
  }
});

test("every quick link is an external https link that opens safely in a new tab", () => {
  for (const link of renderLinks()) {
    expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  }
});
