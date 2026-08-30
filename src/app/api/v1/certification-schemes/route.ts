import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * Serves the fact-checked reference dataset (data/bis-standards-dataset/
 * qco-standards.json — see that directory's README for provenance and
 * correction notes) as a searchable, filterable list of BIS certification
 * schemes. This is NOT the retrieval engine — it's a small, hand-verified
 * static reference set (22 entries at time of writing), each with its own
 * source_url and verification_status. Never mixed with or presented as
 * live evidence from the intelligence pipeline (src/lib/retrieval.ts etc.)
 * — see docs/ui/UI_DATA_AND_TRUTH_RULES.md.
 */

interface QcoEntry {
  is_number?: string;
  title?: string;
  category?: string;
  scheme?: string;
  mandatory_qco?: boolean;
  scope_summary?: string;
  key_testing_parameters?: string[];
  certification_route?: string;
  verification_status?: string;
  verification_note?: string;
  source_url?: string;
  source_note?: string;
  retrieved_at?: string;
}

export interface CertificationSchemeItem {
  standardNumber: string;
  title: string;
  category: string | null;
  scheme: string | null;
  mandatoryQco: boolean;
  scopeSummary: string | null;
  certificationRoute: string | null;
  testingParameters: string[];
  verificationStatus: string | null;
  sourceUrl: string | null;
}

async function loadEntries(): Promise<QcoEntry[]> {
  const filePath = path.join(process.cwd(), "data/bis-standards-dataset/qco-standards.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function toItem(e: QcoEntry): CertificationSchemeItem | null {
  if (!e.is_number) return null;
  return {
    standardNumber: e.is_number,
    title: e.title ?? e.is_number,
    category: e.category ?? null,
    scheme: e.scheme ?? null,
    mandatoryQco: e.mandatory_qco === true,
    scopeSummary: e.scope_summary ?? null,
    certificationRoute: e.certification_route ?? null,
    testingParameters: e.key_testing_parameters ?? [],
    verificationStatus: e.verification_status ?? null,
    sourceUrl: e.source_url ?? null,
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const sector = req.nextUrl.searchParams.get("sector")?.trim().toLowerCase() ?? "";

  let entries: QcoEntry[];
  try {
    entries = await loadEntries();
  } catch (err) {
    console.error("[api/v1/certification-schemes]", err);
    return NextResponse.json({ error: "Reference dataset unavailable" }, { status: 500 });
  }

  let items = entries.map(toItem).filter((i): i is CertificationSchemeItem => i !== null);

  if (sector) {
    items = items.filter((i) => i.category?.toLowerCase().includes(sector));
  }
  if (q) {
    items = items.filter((i) =>
      [i.standardNumber, i.title, i.category, i.scheme, i.scopeSummary]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }

  const sectors = [...new Set(entries.map((e) => e.category).filter((c): c is string => !!c))].sort();

  return NextResponse.json({ items, total: items.length, sectors });
}
