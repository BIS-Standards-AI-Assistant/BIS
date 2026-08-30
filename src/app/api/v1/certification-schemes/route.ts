import { NextRequest, NextResponse } from "next/server";
import { loadCertificationSchemes } from "@/lib/certification-schemes";

export type { CertificationSchemeItem } from "@/lib/certification-schemes";

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
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const sector = req.nextUrl.searchParams.get("sector")?.trim().toLowerCase() ?? "";

  let items;
  try {
    items = await loadCertificationSchemes();
  } catch (err) {
    console.error("[api/v1/certification-schemes]", err);
    return NextResponse.json({ error: "Reference dataset unavailable" }, { status: 500 });
  }

  const sectors = [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))].sort();

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

  return NextResponse.json({ items, total: items.length, sectors });
}
