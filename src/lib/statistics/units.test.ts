import { describe, expect, test } from "vitest";
import { areComparable, compareQuantities, normalise, unitDimension } from "./units";
import { extractStatistics } from "./extract";

describe("SI prefixes are case-sensitive", () => {
  test("a millipascal is not a megapascal", () => {
    expect(normalise(50, "mPa")).toEqual({ value: 0.05, unit: "Pa" });
    expect(normalise(50, "MPa")).toEqual({ value: 50_000_000, unit: "Pa" });
    expect(compareQuantities({ value: 1, unit: "MPa" }, { value: 1, unit: "mPa" })).toBeCloseTo(999_999.999);
  });

  test.each([
    [1, "mV", 0.001, "V"],
    [1, "MV", 1_000_000, "V"],
    [1, "mW", 0.001, "W"],
    [1, "MW", 1_000_000, "W"],
    [1, "MHz", 1_000_000, "Hz"],
  ])("%s %s -> %s %s", (v, u, ev, eu) => {
    expect(normalise(v, u)).toEqual({ value: ev, unit: eu });
  });

  test("a viscosity extracted in mPa·s normalises as millipascals", () => {
    const [stat] = extractStatistics("Viscosity shall be 50 mPa at 25 °C.");
    expect(stat.unit).toBe("mPa");
    expect(stat.normalizedValue).toBe(0.05);
    expect(stat.normalizedUnit).toBe("Pa");
  });
});

describe("case-insensitive fallback", () => {
  test("units set in capitals still resolve when only one unit fits", () => {
    expect(normalise(2, "KG")).toEqual({ value: 2000, unit: "g" });
    expect(normalise(5, "MM")).toEqual({ value: 5, unit: "mm" });
    expect(normalise(3, "KN")).toEqual({ value: 3000, unit: "N" });
    expect(normalise(20, "°c")).toEqual({ value: 20, unit: "°C" });
  });

  test("spellings of the same unit are not treated as ambiguous", () => {
    expect(normalise(250, "ML")).toEqual({ value: 250, unit: "ml" });
    expect(normalise(250, "mL")).toEqual({ value: 250, unit: "ml" });
  });

  test("a spelling that could be milli- or mega- is not normalised", () => {
    expect(normalise(50, "mpa")).toBeNull();
    expect(normalise(50, "MPA")).toBeNull();
    expect(normalise(5, "mv")).toBeNull();
    expect(compareQuantities({ value: 1, unit: "mpa" }, { value: 1, unit: "Pa" })).toBeNull();
  });

  test("but its dimension is still known, since every reading agrees on it", () => {
    expect(unitDimension("mpa")).toBe("pressure");
    expect(areComparable("mpa", "kPa")).toBe(true);
  });
});

test("an inherited object key is not a unit", () => {
  expect(normalise(1, "constructor")).toBeNull();
  expect(unitDimension("toString")).toBe("unknown");
});
