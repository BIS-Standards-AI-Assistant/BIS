/**
 * Geocodes the real city/state on each BIS recognised-laboratory record
 * (data/bis-standards-dataset/recognised-laboratories.json) into real
 * coordinates, using OpenStreetMap's free Nominatim service — no API key,
 * no billing account, matching this project's zero-cost-floor policy
 * (docs/ui/SIH.md §23). Output:
 * data/bis-standards-dataset/laboratory-coordinates.json, a map of
 * "city|state" -> { latitude, longitude, displayName } | null.
 *
 * This does NOT invent a location for a lab: a combo Nominatim can't
 * resolve is written as null and src/lib/laboratories.ts simply has no
 * coordinates for that lab, same honesty rule as
 * data-laboratories-convert.ts's "nothing inferred beyond what the source
 * states." Geocoding is by city+state only (not street address, which the
 * source data doesn't have), so a marker represents "a recognised
 * laboratory is in this city," not that lab's exact building.
 *
 * Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
 * requires max 1 request/second and an identifying User-Agent — both
 * honored below. 127 unique city/state combos (as of this run) take
 * ~2-3 minutes.
 *
 * Usage: npx tsx scripts/data-laboratories-geocode.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const LABS_PATH = path.join(__dirname, "../data/bis-standards-dataset/recognised-laboratories.json");
const OUT_PATH = path.join(__dirname, "../data/bis-standards-dataset/laboratory-coordinates.json");
const USER_AGENT = "BIS-Standards-Navigator/1.0 (github.com/BIS-Standards-AI-Assistant/BIS; educational SIH26107 project)";
const REQUEST_INTERVAL_MS = 1100; // Nominatim policy: max 1 req/sec — 1.1s gives headroom.

/**
 * The source recognition list has a handful of verified typos (checked
 * against real Indian place names, e.g. "Bengulur" -> Bengaluru,
 * "Amhedabad" -> Ahmedabad). This corrects the geocoding QUERY only —
 * LaboratoryItem.city (src/lib/laboratories.ts) keeps the source's
 * original spelling verbatim, since that field represents what the
 * official recognition list says, not a corrected version. Keyed by the
 * same "city|state" combo as `combos` below.
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

interface LabRecord {
  city: string | null;
  state: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  displayName: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeOnce(queryOverride: string | undefined, city: string | null, state: string): Promise<GeoPoint | null> {
  const base = queryOverride ?? (city ? `${city}, ${state}` : state);
  const query = `${base}, India`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");

  const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.warn(`  HTTP ${res.status} for "${query}"`);
    return null;
  }
  const body = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (body.length === 0) return null;
  return { latitude: Number(body[0].lat), longitude: Number(body[0].lon), displayName: body[0].display_name };
}

/**
 * Resumable: an existing output file's already-matched entries are kept
 * as-is (no re-querying Nominatim for combos that already worked). Only
 * missing combos, nulls, and anything with a query override newer than
 * its cached result are (re-)geocoded — so fixing one typo's override
 * costs one request, not another full 127-request run.
 */
async function main() {
  const labs: LabRecord[] = JSON.parse(readFileSync(LABS_PATH, "utf-8"));

  const combos = new Map<string, { city: string | null; state: string }>();
  for (const lab of labs) {
    const key = `${lab.city ?? ""}|${lab.state}`;
    if (!combos.has(key)) combos.set(key, { city: lab.city, state: lab.state });
  }

  const existing: Record<string, GeoPoint | null> = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, "utf-8")) : {};

  const toFetch = [...combos.entries()].filter(([key]) => !existing[key] || key in GEOCODE_QUERY_OVERRIDE);
  console.log(`${combos.size} unique city/state combinations, ${toFetch.length} need (re-)geocoding (1 req/sec)...`);

  const results: Record<string, GeoPoint | null> = { ...existing };
  let done = 0;
  let matched = 0;
  for (const [key, { city, state }] of toFetch) {
    const point = await geocodeOnce(GEOCODE_QUERY_OVERRIDE[key], city, state);
    results[key] = point;
    done++;
    if (point) matched++;
    else console.warn(`  No match: "${GEOCODE_QUERY_OVERRIDE[key] ?? `${city ?? "(no city)"}, ${state}`}"`);
    if (done % 10 === 0) console.log(`  ${done}/${toFetch.length}...`);
    await sleep(REQUEST_INTERVAL_MS);
  }

  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2) + "\n", "utf-8");
  const totalMatched = Object.values(results).filter(Boolean).length;
  console.log(`Wrote ${combos.size} entries to ${OUT_PATH} — ${totalMatched} matched, ${combos.size - totalMatched} unmatched (${matched}/${toFetch.length} newly resolved this run).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
