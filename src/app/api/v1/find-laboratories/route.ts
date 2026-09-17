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
 * so `location` is matched against each laboratory's state/city text.
 * `standardNumber` is accepted but never used to filter — the source data
 * has no per-standard testing-scope field, so claiming a capability match
 * here would be fabrication (§24: "do not fabricate laboratories").
 *
 * Matched laboratories now carry real `lat`/`lng` (city/state-level, from
 * scripts/geocode-laboratories.ts — OpenStreetMap Nominatim, never
 * fabricated; null when unresolved) so a map view is possible. This is a
 * DIFFERENT geocoding path from `mapProvider` below, which geocodes the
 * user's *typed search string* via Google Maps and is unrelated to
 * per-laboratory coordinates — still blocked on a missing API key, still
 * reported separately, and results below are still never distance-sorted
 * (combining two different geocoders' coordinate systems/precision for a
 * distance claim is a separate, not-yet-made decision).
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
      lat: lab.lat,
      lng: lab.lng,
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
      note: "This is a separate geocoder from the laboratories' own coordinates (see each entry's lat/lng) — it geocodes your typed search text only, informationally, and results below are not distance-sorted by it.",
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
