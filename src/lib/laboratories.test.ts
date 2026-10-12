// @vitest-environment node
import { describe, test, expect, beforeAll } from "vitest";
import { isRecognitionExpired, loadLaboratories, type LaboratoryItem } from "./laboratories";

function lab(recognitionValidUpto: string | null): LaboratoryItem {
  return {
    id: "1",
    slNo: 1,
    name: "Test Lab",
    city: "Noida",
    state: "Uttar Pradesh",
    stateRaw: "U.P.",
    type: "Private",
    oslCode: "1",
    recognitionValidUpto,
    recognitionValidUptoRaw: recognitionValidUpto ?? "",
    currentStatus: "Active",
    remarks: null,
    lat: null,
    lng: null,
  };
}

describe("isRecognitionExpired", () => {
  const asOf = new Date("2026-10-13T00:00:00Z");

  test("a past validity date has expired; a future one has not", () => {
    expect(isRecognitionExpired(lab("2026-10-12"), asOf)).toBe(true);
    expect(isRecognitionExpired(lab("2027-02-14"), asOf)).toBe(false);
  });

  test("recognition is still valid on its last day", () => {
    expect(isRecognitionExpired(lab("2026-10-13"), asOf)).toBe(false);
  });

  test("the last day runs to midnight in India, not UTC", () => {
    const valid = lab("2026-10-13");
    // 05:30 IST is UTC midnight — the old cut-off.
    expect(isRecognitionExpired(valid, new Date("2026-10-13T06:00:00+05:30"))).toBe(false);
    expect(isRecognitionExpired(valid, new Date("2026-10-13T23:59:59+05:30"))).toBe(false);
    expect(isRecognitionExpired(valid, new Date("2026-10-14T00:00:00+05:30"))).toBe(true);
  });

  test("an unparseable validity date is not treated as expired", () => {
    expect(isRecognitionExpired(lab("14.02.2027"), asOf)).toBe(false);
  });

  test("an unknown validity date is never reported as expired", () => {
    expect(isRecognitionExpired(lab(null), asOf)).toBe(false);
  });

  test("defaults to the current date", () => {
    expect(isRecognitionExpired(lab("2000-01-01"))).toBe(true);
    expect(isRecognitionExpired(lab("2999-01-01"))).toBe(false);
  });
});

// Integrity checks over the real shipped dataset. The laboratory finder and
// compliance map render these rows directly, so a bad regeneration of the
// JSON should fail here rather than on the page.
describe("recognised-laboratories dataset", () => {
  let labs: LaboratoryItem[];
  beforeAll(async () => {
    labs = await loadLaboratories();
  });

  test("loads a non-empty list and caches it", async () => {
    expect(labs.length).toBeGreaterThan(0);
    expect(await loadLaboratories()).toBe(labs);
  });

  test("ids, OSL codes and serial numbers are unique", () => {
    for (const key of ["id", "oslCode", "slNo"] as const) {
      expect(new Set(labs.map((l) => l[key])).size, key).toBe(labs.length);
    }
  });

  test("every row has a name, a state and a known type and status", () => {
    for (const l of labs) {
      expect(l.name.trim(), l.id).not.toBe("");
      expect(l.state.trim(), l.id).not.toBe("");
      expect(["Private", "Government"], l.id).toContain(l.type);
      expect(["Active", "Suspended", "Deferred", "Unknown"], l.id).toContain(l.currentStatus);
    }
  });

  test("validity dates are ISO dates that parse", () => {
    for (const l of labs) {
      if (l.recognitionValidUpto === null) continue;
      expect(l.recognitionValidUpto, l.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(l.recognitionValidUpto)), l.id).toBe(false);
    }
  });

  test("coordinates are either both present and inside India, or both null", () => {
    for (const l of labs) {
      expect(l.lat === null, l.id).toBe(l.lng === null);
      if (l.lat === null || l.lng === null) continue;
      expect(l.lat, l.id).toBeGreaterThan(6);
      expect(l.lat, l.id).toBeLessThan(37.5);
      expect(l.lng, l.id).toBeGreaterThan(68);
      expect(l.lng, l.id).toBeLessThan(97.5);
    }
  });
});
