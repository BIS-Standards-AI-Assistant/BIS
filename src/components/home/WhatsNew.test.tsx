import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import { FEATURED_STANDARDS, WhatsNew } from "./WhatsNew";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

interface QcoRecord {
  standard_id?: string;
  standard_number: string;
  part?: string | null;
  section?: string | null;
  year?: string;
  scheme?: string;
  mandatory_qco?: boolean;
  status?: string;
}

const records: QcoRecord[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/bis-standards-dataset/qco-standards.json"), "utf-8"),
);

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** The slug the Standards Register gives each record (first record wins; later duplicates use their standard id). */
const registerSlug = new Map<QcoRecord, string>();
{
  const seen = new Set<string>();
  for (const r of records) {
    let slug = slugify([r.standard_number, r.part, r.section].filter(Boolean).join("-"));
    if (seen.has(slug) && r.standard_id) slug = slugify(r.standard_id);
    seen.add(slug);
    registerSlug.set(r, slug);
  }
}

function canonical(r: QcoRecord): string {
  const part = r.part ? ` (${r.part}${r.section ? `/${r.section}` : ""})` : "";
  return `${r.standard_number}${part}${r.year ? `:${r.year}` : ""}`;
}

describe("FEATURED_STANDARDS mirror the reference dataset", () => {
  test.each(FEATURED_STANDARDS.map((f) => [f.standardNumber, f] as const))("%s", (_number, featured) => {
    const record = records.find((r) => registerSlug.get(r) === featured.id);
    // The link resolves: the id is a register slug the detail page knows.
    expect(record, `no reference record has register slug ${featured.id}`).toBeDefined();
    // Current edition, scheme and mandatory status come from that record.
    expect(featured.standardNumber).toBe(canonical(record!));
    expect(featured.scheme).toBe(record!.scheme);
    expect(featured.meta.startsWith("Mandatory")).toBe(record!.mandatory_qco === true);
  });
});

describe("WhatsNew", () => {
  test("presents curated standards, not dated news or an invented count", () => {
    render(
      <LanguageProvider>
        <WhatsNew />
      </LanguageProvider>,
    );
    expect(screen.getByRole("heading", { name: "Featured Standards" })).toBeInTheDocument();
    expect(screen.queryByText(/What's New/)).not.toBeInTheDocument();
    expect(screen.queryByText(/22\+/)).not.toBeInTheDocument();
  });

  test("every entry links to its standard page", () => {
    render(
      <LanguageProvider>
        <WhatsNew />
      </LanguageProvider>,
    );
    for (const f of FEATURED_STANDARDS) {
      expect(screen.getByRole("link", { name: new RegExp(f.standardNumber.replace(/[()]/g, "\\$&")) })).toHaveAttribute(
        "href",
        `/standards/${f.id}`,
      );
    }
  });
});
