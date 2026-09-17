/**
 * Adds real lat/lng coordinates to the BIS recognised-laboratories dataset
 * (data/bis-standards-dataset/recognised-laboratories.json, produced by
 * scripts/data-laboratories-convert.ts from the official source CSV, which
 * itself carries no coordinates).
 *
 * Geocodes via OpenStreetMap Nominatim — free, no API key, matching this
 * project's Tier-0 zero-cost rule (docs/ui/SIH.md §23). This is a
 * CITY/STATE-LEVEL geocode, not a street-address lookup: the source data
 * has no street address, only name/city/state, so a query like
 * "Noida, Uttar Pradesh, India" is the most precise input honestly
 * available. Every lab in the same city therefore maps to the same point —
 * that is the accuracy ceiling of the source data, not a bug in this
 * script.
 *
 * Never fabricates a coordinate. An unresolved city/state pair is written
 * as lat: null, lng: null and counted in the summary — this dataset
 * already had one Math.random()-fabricated-coordinate bug found and fixed
 * (see src/lib/compliance-map.ts's doc comment); this script exists
 * specifically not to reintroduce that pattern.
 *
 * Caches every city/state query by a normalized key in a checked-in
 * sidecar file (GEOCODE_CACHE_PATH below) so re-running after a CSV update
 * only geocodes genuinely new city/state pairs, not all ~400 rows again —
 * Nominatim's usage policy caps at 1 request/second and asks callers not
 * to re-request unchanged data.
 *
 * Usage: npm run data:geocode-laboratories
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { politeFetch } from "./data-lib/rate-limit";
import type { LaboratoryItem } from "../src/lib/laboratories";

const LAB_JSON_PATH = path.join(__dirname, "../data/bis-standards-dataset/recognised-laboratories.json");
const GEOCODE_CACHE_PATH = path.join(__dirname, "../data/bis-standards-dataset/raw/laboratory-geocode-cache.json");

type CachedResult = { lat: number; lng: number } | null;
type GeocodeCache = Record<string, CachedResult>;

/** Normalizes a lab's location into the cache/query key — city+state, or state alone when city is null. */
export function locationKey(lab: Pick<LaboratoryItem, "city" | "state">): string {
  return lab.city ? `${lab.city}|${lab.state}` : lab.state;
}

function loadCache(): GeocodeCache {
  if (!existsSync(GEOCODE_CACHE_PATH)) return {};
  return JSON.parse(readFileSync(GEOCODE_CACHE_PATH, "utf-8")) as GeocodeCache;
}

/**
 * The source recognition list has a handful of verified spelling errors
 * (checked against real Indian place names — e.g. "Bengulur" is really
 * Bengaluru). This corrects the geocoding QUERY only, keyed by the same
 * locationKey() format as the cache — LaboratoryItem.city still shows the
 * source list's original spelling verbatim in the UI, since that field
 * represents what BIS's own list says, not a corrected version.
 */
const GEOCODE_QUERY_OVERRIDE: Record<string, string> = {
  "New Delh|Delhi": "New Delhi, Delhi",
  "Amhedabad|Gujarat": "Ahmedabad, Gujarat",
  "Kudli (Sonepat)|Haryana": "Kundli, Haryana",
  "Navi Mumabi|Maharashtra": "Navi Mumbai, Maharashtra",
  "Derabassi|Punjab": "Dera Bassi, Punjab",
  "New Modern Shahdara|Delhi": "Shahdara, Delhi",
  "Vishakhapatnam|Andhra Pradesh": "Visakhapatnam, Andhra Pradesh",
  "Bengulur|Karnataka": "Bengaluru, Karnataka",
};

interface NominatimResult {
  lat: string;
  lon: string;
}

async function geocodeLocation(city: string | null, state: string, queryOverride?: string): Promise<CachedResult> {
  const q = encodeURIComponent(queryOverride ? `${queryOverride}, India` : [city, state, "India"].filter(Boolean).join(", "));
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=in`;
  try {
    const res = await politeFetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const results = (await res.json()) as NominatimResult[];
    if (results.length === 0) return null;
    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.warn(`  geocode failed for "${city ?? ""}, ${state}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Pure: applies a resolved geocode cache to a list of labs. Never guesses — an uncached or null-cached key stays null/null. */
export function enrichLaboratories(labs: LaboratoryItem[], cache: GeocodeCache): LaboratoryItem[] {
  return labs.map((lab) => {
    const cached = cache[locationKey(lab)] ?? null;
    return { ...lab, lat: cached?.lat ?? null, lng: cached?.lng ?? null };
  });
}

async function main() {
  const labs = JSON.parse(readFileSync(LAB_JSON_PATH, "utf-8")) as LaboratoryItem[];
  const cache = loadCache();

  const uniqueKeys = [...new Set(labs.map((l) => locationKey(l)))];
  // A key with a query override is re-geocoded even if already cached
  // (null) — fixing a source-data typo shouldn't require deleting the
  // stale null entry by hand before re-running.
  const toGeocode = uniqueKeys.filter((k) => !(k in cache) || (cache[k] === null && k in GEOCODE_QUERY_OVERRIDE));

  console.log(`${labs.length} laboratories across ${uniqueKeys.length} distinct city/state locations.`);
  console.log(`${uniqueKeys.length - toGeocode.length} already cached, ${toGeocode.length} to geocode.\n`);

  for (const [i, key] of toGeocode.entries()) {
    const lab = labs.find((l) => locationKey(l) === key)!;
    const result = await geocodeLocation(lab.city, lab.state, GEOCODE_QUERY_OVERRIDE[key]);
    cache[key] = result;
    console.log(`  [${i + 1}/${toGeocode.length}] ${key} -> ${result ? `${result.lat}, ${result.lng}` : "NOT RESOLVED"}`);
    // Persist incrementally so an interrupted run (rate limit, network) doesn't lose earlier progress.
    writeFileSync(GEOCODE_CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf-8");
  }

  const enriched = enrichLaboratories(labs, cache);

  writeFileSync(LAB_JSON_PATH, JSON.stringify(enriched, null, 2) + "\n", "utf-8");

  const resolvedCount = enriched.filter((l) => l.lat !== null).length;
  const unresolvedKeys = uniqueKeys.filter((k) => cache[k] === null);

  console.log(`\nWrote ${LAB_JSON_PATH}`);
  console.log(`${resolvedCount}/${labs.length} laboratories now have coordinates.`);
  if (unresolvedKeys.length > 0) {
    console.log(`${unresolvedKeys.length} location(s) could not be resolved (left as null, not guessed):`);
    for (const k of unresolvedKeys) console.log(`  - ${k}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
