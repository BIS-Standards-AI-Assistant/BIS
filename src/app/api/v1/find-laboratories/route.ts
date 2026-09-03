import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { geocode, isMapProviderConfigured } from "@/lib/providers/map-provider";
import { rateLimitOrNull } from "@/lib/rate-limit-http";

/**
 * Laboratory Finder (pfinal.md §6). Per the audit (docs/FINAL_E2E_AUDIT.md),
 * this feature is blocked on two independent things: (1) a configured map
 * provider, and (2) an actual laboratory dataset — neither of which exist
 * in this codebase or its ingested corpus. This route implements the real
 * pipeline shape (§6.3) up to the point where real data would be needed,
 * and reports each blocker explicitly and separately rather than
 * fabricating either a location or a laboratory record. Per §24: "If
 * laboratory data does not exist: do not fabricate laboratories" and "If
 * map API credentials are unavailable: report MAP_PROVIDER_BLOCKED."
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

  // No laboratories table exists (confirmed live, docs/P1_IMPLEMENTATION_AUDIT.md
  // and docs/FINAL_E2E_AUDIT.md) — this is unconditionally true regardless
  // of geocoding success, so report it up front rather than doing a
  // geocode lookup whose result would have nowhere real to be used.
  const laboratoryDataAvailable = false;

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
    },
    laboratoryDataAvailable,
    laboratories: [],
    message: laboratoryDataAvailable
      ? null
      : "No verified laboratory records are currently available in this system's knowledge base.",
  });
}
