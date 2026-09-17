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
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const LABS_PATH = path.join(__dirname, "../data/bis-standards-dataset/recognised-laboratories.json");
const OUT_PATH = path.join(__dirname, "../data/bis-standards-dataset/laboratory-coordinates.json");
const USER_AGENT = "BIS-Standards-Navigator/1.0 (github.com/BIS-Standards-AI-Assistant/BIS; educational SIH26107 project)";
const REQUEST_INTERVAL_MS = 1100; // Nominatim policy: max 1 req/sec — 1.1s gives headroom.

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

async function geocodeOnce(city: string | null, state: string): Promise<GeoPoint | null> {
  const query = city ? `${city}, ${state}, India` : `${state}, India`;
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

async function main() {
  const labs: LabRecord[] = JSON.parse(readFileSync(LABS_PATH, "utf-8"));

  const combos = new Map<string, { city: string | null; state: string }>();
  for (const lab of labs) {
    const key = `${lab.city ?? ""}|${lab.state}`;
    if (!combos.has(key)) combos.set(key, { city: lab.city, state: lab.state });
  }

  console.log(`Geocoding ${combos.size} unique city/state combinations (this takes a few minutes, 1 req/sec)...`);

  const results: Record<string, GeoPoint | null> = {};
  let done = 0;
  let matched = 0;
  for (const [key, { city, state }] of combos) {
    const point = await geocodeOnce(city, state);
    results[key] = point;
    done++;
    if (point) matched++;
    else console.warn(`  No match: "${city ?? "(no city)"}, ${state}"`);
    if (done % 10 === 0) console.log(`  ${done}/${combos.size}...`);
    await sleep(REQUEST_INTERVAL_MS);
  }

  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${combos.size} entries to ${OUT_PATH} — ${matched} matched, ${combos.size - matched} unmatched.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
