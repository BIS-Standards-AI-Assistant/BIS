import { NextRequest, NextResponse } from "next/server";
import { loadLaboratories, isRecognitionExpired, type LaboratoryItem } from "@/lib/laboratories";

export type { LaboratoryItem } from "@/lib/laboratories";

/**
 * Serves the BIS "Group 1" recognised-laboratories reference dataset
 * (data/bis-standards-dataset/recognised-laboratories.json — see that
 * directory's README and scripts/data-laboratories-convert.ts for
 * provenance) as a searchable, filterable directory. This is a location/
 * status directory only — the source data carries no per-standard testing
 * scope, so this endpoint never filters or ranks by "can test standard X".
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const state = req.nextUrl.searchParams.get("state")?.trim() ?? "";
  const status = req.nextUrl.searchParams.get("status")?.trim() ?? "";
  const type = req.nextUrl.searchParams.get("type")?.trim() ?? "";

  let items: LaboratoryItem[];
  try {
    items = await loadLaboratories();
  } catch (err) {
    console.error("[api/v1/laboratories]", err);
    return NextResponse.json({ error: "Laboratory dataset unavailable" }, { status: 500 });
  }

  const states = [...new Set(items.map((i) => i.state))].sort();
  const stateCounts = states.map((s) => ({ state: s, count: items.filter((i) => i.state === s).length }));

  if (state) {
    items = items.filter((i) => i.state === state);
  }
  if (status) {
    items = items.filter((i) => i.currentStatus.toLowerCase() === status.toLowerCase());
  }
  if (type) {
    items = items.filter((i) => i.type.toLowerCase() === type.toLowerCase());
  }
  if (q) {
    items = items.filter((i) => [i.name, i.city, i.state, i.oslCode].filter(Boolean).some((f) => f!.toLowerCase().includes(q)));
  }

  const withExpiry = items.map((i) => ({ ...i, recognitionExpired: isRecognitionExpired(i) }));

  return NextResponse.json({ items: withExpiry, total: withExpiry.length, states: stateCounts });
}
