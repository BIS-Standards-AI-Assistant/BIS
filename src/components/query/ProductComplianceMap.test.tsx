import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductComplianceMap } from "./ProductComplianceMap";
import type { ComplianceMap } from "@/types/api";

afterEach(() => vi.unstubAllGlobals());

function map(overrides: Partial<ComplianceMap> = {}): ComplianceMap {
  return {
    standards: [{ standardNumber: "IS 4151:2015", title: "Helmets", confidence: "high" }],
    certifications: [
      {
        standardNumber: "IS 4151:2015",
        scheme: "Scheme-I (ISI)",
        mandatoryQco: true,
        certificationRoute: "Factory audit + lab testing",
        verificationStatus: "verified_accurate",
        sourceUrl: "https://www.bis.gov.in/x",
      },
    ],
    testing: [{ parameter: "Shock absorption", standardNumber: "IS 4151:2015", sourceUrl: null }],
    unmatchedStandards: [],
    ...overrides,
  };
}

function labs(items: Array<{ id: string; name: string; state: string; recognitionExpired?: boolean }>) {
  return {
    ok: true,
    json: async () => ({
      items: items.map((l) => ({ city: null, type: "Private", oslCode: l.id, currentStatus: "Active", recognitionExpired: false, ...l })),
      total: items.length,
      states: [...new Set(items.map((l) => l.state))].map((state) => ({ state, count: items.filter((l) => l.state === state).length })),
    }),
  };
}

describe("ProductComplianceMap", () => {
  test("is a tab list whose selected tab controls the panel", async () => {
    render(<ProductComplianceMap complianceMap={map()} />);
    const certTab = screen.getByRole("tab", { name: /Certification/ });
    expect(certTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", certTab.id);

    const testingTab = screen.getByRole("tab", { name: /Testing/ });
    await userEvent.setup().click(testingTab);
    expect(testingTab).toHaveAttribute("aria-selected", "true");
    expect(certTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", testingTab.id);
  });

  test("certification rows show scheme, QCO status, route and a readable verification status", () => {
    render(<ProductComplianceMap complianceMap={map()} />);
    expect(screen.getByText("Scheme-I (ISI)")).toBeInTheDocument();
    expect(screen.getByText("Mandatory under a Quality Control Order")).toBeInTheDocument();
    expect(screen.getByText("Route: Factory audit + lab testing")).toBeInTheDocument();
    expect(screen.getByText(/Reference-data status:\s*Verified/)).toBeInTheDocument();
    expect(screen.queryByText(/verified_accurate/)).not.toBeInTheDocument();
  });

  test("with nothing matched, it names the unmatched standards and does not imply clearance", () => {
    render(<ProductComplianceMap complianceMap={map({ certifications: [], unmatchedStandards: ["IS 14543:2016"] })} />);
    expect(screen.getByText("No certification scheme on record for these standards.")).toBeInTheDocument();
    expect(screen.getByText(/IS 14543:2016 has no entry/)).toHaveTextContent("not confirmation that certification is not required");
  });

  test("testing rows say they name parameters, not clauses", async () => {
    render(<ProductComplianceMap complianceMap={map()} />);
    await userEvent.setup().click(screen.getByRole("tab", { name: /Testing/ }));
    expect(screen.getByText("Shock absorption")).toBeInTheDocument();
    expect(screen.getByText(/carries no clause numbers/)).toBeInTheDocument();
  });

  test("the labs tab loads the directory, filters by state, and flags expired recognition", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(labs([
        { id: "1", name: "Noida Lab", state: "Uttar Pradesh" },
        { id: "2", name: "Delhi Lab", state: "Delhi", recognitionExpired: true },
      ]))
      .mockResolvedValueOnce(labs([{ id: "2", name: "Delhi Lab", state: "Delhi", recognitionExpired: true }]));
    vi.stubGlobal("fetch", fetchSpy);
    render(<ProductComplianceMap complianceMap={map()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: /Labs/ }));
    expect(await screen.findByText("2 recognised laboratories")).toBeInTheDocument();
    expect(screen.getByText(/not.*filtered by the standards above/)).toBeInTheDocument();
    expect(screen.getByText("Recognition expired")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filter laboratories by state"), "Delhi");
    await waitFor(() => expect(fetchSpy).toHaveBeenLastCalledWith("/api/v1/laboratories?state=Delhi"));
    expect(await screen.findByText("1 recognised laboratory")).toBeInTheDocument();
  });

  test("a failed directory load says so", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<ProductComplianceMap complianceMap={map()} />);
    await userEvent.setup().click(screen.getByRole("tab", { name: /Labs/ }));
    expect(await screen.findByText("The laboratory directory could not be loaded.")).toBeInTheDocument();
  });
});
