import { describe, test, expect } from "vitest";
import { extractStatistics } from "./extract";

const values = (text: string) => extractStatistics(text).map((s) => s.displayValue);

describe("ordinary English is not mistaken for document metadata", () => {
  test.each([
    ["The rated voltage is 230 V.", "230 V"],
    ["Its mass is 20 kg.", "20 kg"],
    ["The basis 12 mm.", "12 mm"],
    ["Max temp. 40 °C", "40 °C"],
    ["Use a suitable 5 kg load.", "5 kg"],
  ])("%j keeps %j", (text, expected) => {
    expect(values(text)).toContain(expected);
  });

  test("the parameter name survives a lowercase 'is'", () => {
    expect(extractStatistics("The rated voltage is 230 V.")[0]).toMatchObject({
      value: 230,
      unit: "V",
      statisticType: "measurement",
    });
  });

  test.each([
    "Conforms to IS 456 throughout.",
    "Refer ISO 9001 for the system.",
    "See IEC 60335 for safety.",
    "Specified in Table 4 below.",
    "As given on p. 17 of the manual.",
  ])("%j is still rejected", (text) => {
    expect(extractStatistics(text)).toHaveLength(0);
  });
});

describe("single-letter units only in their SI case", () => {
  test("'3 a second time' is not 3 amperes", () => {
    expect(extractStatistics("The test shall be repeated 3 a second time.")).toHaveLength(0);
  });

  test("an uppercase A is still amperes", () => {
    expect(extractStatistics("Rated current 16 A")[0]).toMatchObject({ value: 16, unit: "A", dimension: "current" });
  });

  test("multi-letter units still read case-insensitively", () => {
    expect(values("Mass 5 KG and 2 Kg")).toEqual(["5 KG", "2 Kg"]);
  });

  test("a percentage is unaffected", () => {
    expect(extractStatistics("Moisture 10 %")[0]).toMatchObject({ value: 10, statisticType: "percentage" });
  });
});

describe("ranges", () => {
  test("'and' without 'between' joins two measurements, not an inverted range", () => {
    const stats = extractStatistics("Mass 5 kg and 2 kg");
    expect(stats.map((s) => s.statisticType)).toEqual(["measurement", "measurement"]);
    expect(stats.every((s) => s.validationStatus === "extracted")).toBe(true);
  });

  test("'between … and …' is still a range", () => {
    expect(extractStatistics("between 10 and 20 kg")[0]).toMatchObject({ statisticType: "range", min: 10, max: 20 });
  });
});

describe("results are in document order", () => {
  test("a repeated value keeps its own position", () => {
    expect(values("Weight 5 kg, then 10 % moisture, then again 5 kg.")).toEqual(["5 kg", "10 %", "5 kg"]);
  });

  test("a count between two measurements stays in place", () => {
    expect(values("Mass 5 kg; 10 specimens; length 2 m")).toEqual(["5 kg", "10 specimens", "2 m"]);
  });
});
