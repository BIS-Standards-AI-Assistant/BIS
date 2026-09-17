import { describe, test, expect } from "vitest";
import { locationKey, enrichLaboratories } from "./geocode-laboratories";
import type { LaboratoryItem } from "../src/lib/laboratories";

function lab(overrides: Partial<LaboratoryItem> = {}): LaboratoryItem {
  return {
    id: "lab-1",
    slNo: 1,
    name: "Test Lab",
    city: "Noida",
    state: "Uttar Pradesh",
    stateRaw: "U.P.",
    type: "Private",
    oslCode: "1234",
    recognitionValidUpto: null,
    recognitionValidUptoRaw: "",
    currentStatus: "Active",
    remarks: null,
    lat: null,
    lng: null,
    ...overrides,
  };
}

describe("locationKey", () => {
  test("combines city and state when city is present", () => {
    expect(locationKey({ city: "Noida", state: "Uttar Pradesh" })).toBe("Noida|Uttar Pradesh");
  });

  test("falls back to state alone when city is null", () => {
    expect(locationKey({ city: null, state: "Delhi" })).toBe("Delhi");
  });

  test("two labs in the same city/state produce the same key (shared geocode, by design)", () => {
    const a = locationKey({ city: "Noida", state: "Uttar Pradesh" });
    const b = locationKey({ city: "Noida", state: "Uttar Pradesh" });
    expect(a).toBe(b);
  });
});

describe("enrichLaboratories", () => {
  test("applies a resolved cache entry to the matching lab", () => {
    const labs = [lab({ city: "Noida", state: "Uttar Pradesh" })];
    const cache = { "Noida|Uttar Pradesh": { lat: 28.5, lng: 77.3 } };
    const enriched = enrichLaboratories(labs, cache);
    expect(enriched[0].lat).toBe(28.5);
    expect(enriched[0].lng).toBe(77.3);
  });

  test("an unresolved (null) cache entry stays null, never a fabricated fallback", () => {
    const labs = [lab({ city: "Nowhere", state: "Nowhere State" })];
    const cache = { "Nowhere|Nowhere State": null };
    const enriched = enrichLaboratories(labs, cache);
    expect(enriched[0].lat).toBeNull();
    expect(enriched[0].lng).toBeNull();
  });

  test("a key missing from the cache entirely also stays null, not a crash", () => {
    const labs = [lab({ city: "Untouched", state: "Untouched State" })];
    const enriched = enrichLaboratories(labs, {});
    expect(enriched[0].lat).toBeNull();
    expect(enriched[0].lng).toBeNull();
  });

  test("two labs sharing a city/state both get the same coordinates", () => {
    const labs = [
      lab({ id: "a", city: "Noida", state: "Uttar Pradesh" }),
      lab({ id: "b", city: "Noida", state: "Uttar Pradesh" }),
    ];
    const cache = { "Noida|Uttar Pradesh": { lat: 28.5, lng: 77.3 } };
    const enriched = enrichLaboratories(labs, cache);
    expect(enriched[0].lat).toBe(enriched[1].lat);
    expect(enriched[0].lng).toBe(enriched[1].lng);
  });

  test("every other field passes through unchanged", () => {
    const labs = [lab({ name: "AES Laboratories (P) Ltd", oslCode: "8117716" })];
    const enriched = enrichLaboratories(labs, {});
    expect(enriched[0].name).toBe("AES Laboratories (P) Ltd");
    expect(enriched[0].oslCode).toBe("8117716");
  });
});
