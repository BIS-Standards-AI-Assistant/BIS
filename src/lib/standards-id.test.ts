import { describe, test, expect } from "vitest";
import { resolveStandardIds, matchesResolvedId } from "./standards-id";

describe("resolveStandardIds", () => {
  test("resolves a clean exact identifier", () => {
    const r = resolveStandardIds("IS 5522:2014");
    expect(r).toHaveLength(1);
    expect(r[0].normalized).toBe("IS 5522:2014");
  });

  test("resolves a bare number with year but no IS prefix", () => {
    const r = resolveStandardIds("5522:2014");
    expect(r[0].normalized).toBe("IS 5522:2014");
  });

  test("resolves 'Indian Standard' spelled out", () => {
    const r = resolveStandardIds("Indian Standard 14543");
    expect(r[0].normalized).toBe("IS 14543");
  });

  test("does not resolve a bare number with no IS/part/section/year context", () => {
    // A lone number like a page count or a year-looking value must not be
    // treated as a standard identifier just because it's numeric.
    const r = resolveStandardIds("2014");
    expect(r).toHaveLength(0);
  });

  // The exact regression this milestone calls out by name: IS 302 Part
  // 2/Sec 6 must never resolve to (or be confused with) Sec 26, and vice
  // versa — a real bug class found earlier in this project (Section 26 of
  // IS 302 Part 2 is clocks, not induction cookers; conflating the two
  // would recommend the wrong safety standard for a real product).
  describe("Sec 6 / Sec 26 regression", () => {
    test("IS 302 (Part 2/Sec 6):2009 resolves with section '6', not '26'", () => {
      const r = resolveStandardIds("IS 302 (Part 2/Sec 6):2009");
      expect(r).toHaveLength(1);
      expect(r[0].section).toBe("6");
      expect(r[0].normalized).toBe("IS 302 (Part 2/Sec 6):2009");
    });

    test("IS 302 (Part 2/Sec 26):2014 resolves with section '26', not '6'", () => {
      const r = resolveStandardIds("IS 302 (Part 2/Sec 26):2014");
      expect(r).toHaveLength(1);
      expect(r[0].section).toBe("26");
      expect(r[0].normalized).toBe("IS 302 (Part 2/Sec 26):2014");
    });

    test("matchesResolvedId for Sec 6 does not match a Sec 26 candidate", () => {
      const [sec6] = resolveStandardIds("IS 302 (Part 2/Sec 6):2009");
      expect(matchesResolvedId("IS 302 (Part 2/Sec 26):2014", sec6)).toBe(false);
    });

    test("matchesResolvedId for Sec 26 does not match a Sec 6 candidate", () => {
      const [sec26] = resolveStandardIds("IS 302 (Part 2/Sec 26):2014");
      expect(matchesResolvedId("IS 302 (Part 2/Sec 6):2009", sec26)).toBe(false);
    });

    test("matchesResolvedId for Sec 6 correctly matches its own real candidate", () => {
      const [sec6] = resolveStandardIds("IS 302 (Part 2/Sec 6):2009");
      expect(matchesResolvedId("IS 302 (Part 2/Sec 6):2009", sec6)).toBe(true);
    });
  });

  test("resolves multiple distinct identifiers in one query without cross-contamination", () => {
    const r = resolveStandardIds("compare IS 14543:2016 and IS 15410:2003");
    const normalized = r.map((x) => x.normalized);
    expect(normalized).toContain("IS 14543:2016");
    expect(normalized).toContain("IS 15410:2003");
  });
});

describe("matchesResolvedId", () => {
  test("returns false for a null candidate", () => {
    const [id] = resolveStandardIds("IS 5522:2014");
    expect(matchesResolvedId(null, id)).toBe(false);
  });

  test("year mismatch is rejected even when the number matches", () => {
    const [id] = resolveStandardIds("IS 5522:2014");
    expect(matchesResolvedId("IS 5522:2020", id)).toBe(false);
  });
});
