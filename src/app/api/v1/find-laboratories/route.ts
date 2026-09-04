import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { geocode, isMapProviderConfigured } from "@/lib/providers/map-provider";
import { rateLimitOrNull } from "@/lib/rate-limit-http";
import { loadLaboratories } from "@/lib/laboratories";

/**
 * Laboratory Finder (pfinal.md §6). Per the audit (docs/FINAL_E2E_AUDIT.md)
 * this was originally blocked on two things: a configured map provider, and
 * an actual laboratory dataset. The dataset now exists (data/bis-standards-
 * dataset/recognised-laboratories.json, from the official BIS Group 1
 * recognised-laboratory list — see scripts/data-laboratories-convert.ts),
 * so `location` is matched against each laboratory's state/city text. The
 * map-provider blocker is unchanged and still reported separately: a
 * geocoded point is informational only, never used to compute or claim a
 * distance, because the dataset carries no coordinates. `standardNumber`
 * is accepted but never used to filter — the source data has no per-
 * standard testing-scope field, so claiming a capability match here would
 * be fabrication (§24: "do not fabricate laboratories").
 */
const RequestSchema = z.object({
  location: z.string().min(1).max(200),
  standardNumber: z.string().min(1).max(50).optional(),
});

const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const limited = rateLimitOrNull(req, "find-laboratories", RATE_LIMIT);
  if (limited) return limited;

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { location, standardNumber } = parsed.data;
  const laboratoryDataAvailable = true;

  const q = location.trim().toLowerCase();
  const all = await loadLaboratories();
  const matches = all
    .filter((lab) => lab.state.toLowerCase().includes(q) || (lab.city ?? "").toLowerCase().includes(q))
    .slice(0, 50)
    .map((lab) => ({
      id: lab.id,
      name: lab.name,
      city: lab.city,
      state: lab.state,
      type: lab.type,
      oslCode: lab.oslCode,
      currentStatus: lab.currentStatus,
      recognitionValidUpto: lab.recognitionValidUpto,
    }));

  let geocodeResult: Awaited<ReturnType<typeof geocode>> | null = null;
  if (isMapProviderConfigured()) {
    geocodeResult = await geocode(location);
  }

  return NextResponse.json({
    query: { location, standardNumber: standardNumber ?? null },
    mapProvider: {
      configured: isMapProviderConfigured(),
      geocoded: geocodeResult && !geocodeResult.blocked ? geocodeResult.data : null,
      blockedReason: !isMapProviderConfigured()
        ? "MAP_PROVIDER_BLOCKED"
        : geocodeResult?.blocked
          ? geocodeResult.reason
          : null,
      note: "Geocoding, when available, is informational only — the laboratory dataset has no coordinates, so results are never distance-sorted.",
    },
    laboratoryDataAvailable,
    laboratories: matches,
    testingScopeNote:
      "This dataset records recognition status and location only. It does not indicate which standards or product categories a laboratory is equipped to test — confirm scope directly with the laboratory or the official BIS testing portal.",
    message:
      matches.length > 0
        ? null
        : `No recognised laboratory matched "${location}". Try a state or city name (e.g. "Maharashtra", "Noida").`,
  });
}
