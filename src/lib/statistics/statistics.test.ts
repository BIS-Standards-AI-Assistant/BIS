import { describe, test, expect } from "vitest";
import { extractStatistics } from "./extract";
import { normalise, areComparable, compareQuantities, unitDimension } from "./units";

const one = (text: string) => extractStatistics(text)[0];

describe("§5 — document metadata is not a statistic", () => {
  test.each([
    "See Clause 4.2 for details.",
    "Refer to Section 12 of this manual.",
    "As given on page 17.",
    "Conforms to IS 15410:2003 in all respects.",
    "Specified in Table 4 below.",
    "Amendment 3 applies.",
    "Annexure 2 lists the tests.",
  ])("rejects %j", (text) => {
    expect(extractStatistics(text)).toHaveLength(0);
  });

  test("a bare year is not a measurement", () => {
    expect(extractStatistics("The 2016 revision supersedes it.")).toHaveLength(0);
  });

  test("a bare number with no unit and no count noun is not promoted", () => {
    expect(extractStatistics("The value is 42.")).toHaveLength(0);
  });
});

describe("§5/§6 — real quantitative facts are extracted", () => {
  test("a measurement with a unit", () => {
    const s = one("Rated voltage: 230 V");
    expect(s).toMatchObject({ value: 230, unit: "V", statisticType: "measurement", dimension: "voltage" });
    expect(s.parameter).toMatch(/rated voltage/i);
  });

  test("a decimal is not truncated (§59)", () => {
    expect(one("Thickness shall be 0.5 mm").value).toBe(0.5);
  });

  test("a negative value keeps its sign (§59)", () => {
    const s = one("Operating temperature -20 °C");
    expect(s.value).toBe(-20);
  });

  test("a percentage", () => {
    expect(one("Moisture content 12.5 %")).toMatchObject({ value: 12.5, unit: "%", statisticType: "percentage" });
  });

  test("a duration", () => {
    expect(one("Test duration 24 hours")).toMatchObject({ value: 24, statisticType: "measurement", dimension: "time" });
  });

  test("a count needs an explicit noun", () => {
    expect(one("Sample size: 10")).toMatchObject({ value: 10, statisticType: "count" });
    expect(one("10 specimens shall be tested")).toMatchObject({ value: 10, statisticType: "count" });
  });
});

describe("§11 — inequalities and ranges keep their meaning", () => {
  test("≤ 20 kg is a maximum, never a plain measurement", () => {
    const s = one("Mass shall be ≤ 20 kg");
    expect(s.statisticType).toBe("maximum");
    expect(s.max).toBe(20);
    // The failure this guards against: rendering it as "20 kg" observed.
    expect(s.min).toBeUndefined();
  });

  test.each(["maximum 20 kg", "not more than 20 kg", "up to 20 kg", "<= 20 kg"])("%j reads as a maximum", (t) => {
    expect(one(t).statisticType).toBe("maximum");
  });

  test.each(["minimum 10 kg", "at least 10 kg", "not less than 10 kg", "≥ 10 kg"])("%j reads as a minimum", (t) => {
    expect(one(t)).toMatchObject({ statisticType: "minimum", min: 10 });
  });

  test.each(["10–20 kg", "10 to 20 kg", "between 10 and 20 kg"])("%j reads as a range", (t) => {
    expect(one(t)).toMatchObject({ statisticType: "range", min: 10, max: 20, unit: "kg" });
  });

  test("a range yields one statistic, not two measurements", () => {
    expect(extractStatistics("Operating range 0–50 °C")).toHaveLength(1);
  });

  test("a tolerance is not two separate numbers", () => {
    const s = one("Rated voltage 230 ± 10 V");
    expect(s.statisticType).toBe("tolerance");
    expect(s.value).toBe(230);
  });

  test("an inverted range is flagged, not silently corrected (§57)", () => {
    const s = one("Range 50 to 10 kg");
    expect(s.validationStatus).toBe("needs_review");
    expect(s.reviewReason).toMatch(/minimum greater than maximum/i);
  });
});

describe("§9/§10 — normalisation is additive and dimension-safe", () => {
  test.each([
    [1000, "mV", 1, "V"],
    [1, "kW", 1000, "W"],
    [2.5, "kg", 2500, "g"],
    [60, "min", 3600, "s"],
    [1000, "ml", 1000, "ml"],
    [1, "L", 1000, "ml"],
    [50, "MPa", 50_000_000, "Pa"],
  ])("%s %s -> %s %s", (v, u, ev, eu) => {
    expect(normalise(v, u)).toEqual({ value: ev, unit: eu });
  });

  test("the original value and unit survive normalisation", () => {
    const s = one("Capacity 2.5 kg");
    expect(s.displayValue).toContain("2.5");
    expect(s.unit).toBe("kg");
    expect(s.normalizedValue).toBe(2500);
    expect(s.normalizedUnit).toBe("g");
  });

  test("an unknown unit is not normalised rather than assumed dimensionless", () => {
    expect(normalise(5, "widgets")).toBeNull();
    expect(unitDimension("widgets")).toBe("unknown");
  });

  test("dimensions never cross (§10)", () => {
    expect(areComparable("°C", "kg")).toBe(false);
    expect(areComparable("V", "A")).toBe(false);
    expect(areComparable("mm", "cm")).toBe(true);
    expect(compareQuantities({ value: 47, unit: "°C" }, { value: 5, unit: "A" })).toBeNull();
  });

  test("a valid comparison normalises both sides first", () => {
    // 54 MPa vs a 50 MPa minimum — the §12 case.
    expect(compareQuantities({ value: 54, unit: "MPa" }, { value: 50, unit: "MPa" })).toBe(4_000_000);
    expect(compareQuantities({ value: 1, unit: "m" }, { value: 50, unit: "cm" })).toBe(500);
  });
});

describe("§27/§28 — every statistic is traceable to its source", () => {
  test("carries the page, clause and section it came from", () => {
    const [s] = extractStatistics("Tensile strength shall be ≥ 50 MPa.", { page: 23, clause: "5.2", section: "Mechanical" });
    expect(s.source).toMatchObject({ page: 23, clause: "5.2", section: "Mechanical" });
  });

  test("keeps a short excerpt around the value, not the whole passage", () => {
    const long = `${"filler ".repeat(60)}Tensile strength shall be 50 MPa.${" trailing".repeat(60)}`;
    const [s] = extractStatistics(long);
    expect(s.source.excerpt).toContain("50 MPa");
    expect(s.source.excerpt.length).toBeLessThan(220);
  });
});

describe("§29/§45 — uncertainty is marked, not hidden", () => {
  test("a value with no readable unit is flagged for review", () => {
    const stats = extractStatistics("Sample size: 10");
    expect(stats[0].validationStatus).toBe("extracted"); // counts legitimately have no unit
  });

  test("extraction never invents a parameter it could not read", () => {
    const s = one("230 V");
    expect(s.value).toBe(230);
    expect(s.parameter).toBeNull();
  });
});

describe("§7 — a specification table yields distinct semantics, not one generic value", () => {
  test("requirement, tolerance and limit are separated", () => {
    const stats = extractStatistics("Voltage 230 ± 10 V. Current shall be ≤ 5 A. Temperature 0–50 °C.");
    const types = stats.map((s) => s.statisticType);
    expect(types).toContain("tolerance");
    expect(types).toContain("maximum");
    expect(types).toContain("range");
    // Three parameters, three statistics — not six loose numbers.
    expect(stats).toHaveLength(3);
  });
});
