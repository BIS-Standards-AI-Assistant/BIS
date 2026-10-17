/**
 * Map/geocoding provider abstraction (pfinal.md §6.2, §15). Google Maps
 * Platform is the chosen provider (user decision, 2026-09-03) — no other
 * provider-specific logic should ever appear outside this file. The key
 * is read from `GOOGLE_MAPS_API_KEY`, server-side only, never exposed to
 * the client (§21).
 *
 * As of this pass, `GOOGLE_MAPS_API_KEY` is not set in this environment.
 * Every function below detects that and returns a typed
 * `{ blocked: true, reason: "MAP_PROVIDER_BLOCKED" }` result rather than
 * throwing or returning fabricated coordinates — per pfinal.md §24's own
 * instruction ("If map API credentials are unavailable: report
 * MAP_PROVIDER_BLOCKED"). Once a real key is added to the environment,
 * these functions call the real Google Maps Geocoding API — the
 * plumbing is real, only the credential is missing.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export type MapProviderResult<T> =
  | { blocked: false; data: T }
  | { blocked: true; reason: "MAP_PROVIDER_BLOCKED"; message: string };

function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
}

export function isMapProviderConfigured(): boolean {
  return apiKey() !== null;
}

const BLOCKED_MESSAGE =
  "No map/geocoding provider is currently configured (GOOGLE_MAPS_API_KEY is not set). Location-based search is unavailable until this is configured.";

// Geocoding is informational on every caller (see
// src/app/api/v1/find-laboratories/route.ts): it must never be able to fail
// or stall the request it decorates.
const GEOCODE_TIMEOUT_MS = 5_000;

export async function geocode(
  address: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = GEOCODE_TIMEOUT_MS,
): Promise<MapProviderResult<GeocodeResult>> {
  const key = apiKey();
  if (!key) {
    return { blocked: true, reason: "MAP_PROVIDER_BLOCKED", message: BLOCKED_MESSAGE };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", key);

  let body: {
    status?: string;
    results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
  };
  try {
    const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      return { blocked: true, reason: "MAP_PROVIDER_BLOCKED", message: `Geocoding request failed (HTTP ${res.status}).` };
    }
    const parsed: unknown = await res.json();
    body = parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    // The URL carries the API key, so only the error's kind is reported.
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return {
      blocked: true,
      reason: "MAP_PROVIDER_BLOCKED",
      message: timedOut ? "Geocoding request timed out." : "Geocoding request failed.",
    };
  }

  const top = body.results?.[0];
  if (body.status !== "OK" || !top) {
    return { blocked: true, reason: "MAP_PROVIDER_BLOCKED", message: `Could not geocode "${address}" (provider status: ${body.status ?? "unknown"}).` };
  }
  return {
    blocked: false,
    data: {
      latitude: top.geometry.location.lat,
      longitude: top.geometry.location.lng,
      formattedAddress: top.formatted_address,
    },
  };
}
