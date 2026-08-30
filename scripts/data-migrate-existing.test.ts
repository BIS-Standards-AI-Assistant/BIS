import { describe, test, expect } from "vitest";
import { normalizedNumberOf } from "./data-migrate-existing";

describe("normalizedNumberOf", () => {
  test("extracts the bare number from a simple canonical number", () => {
    expect(normalizedNumberOf("IS 5522:2014")).toBe("5522");
  });

  test("extracts the bare number from a part/section identifier, ignoring part/section/year", () => {
    // The exact regression class this project has hit before: the
    // normalized number must be the base number only, never accidentally
    // include the section digits.
    expect(normalizedNumberOf("IS 302 (Part 2/Sec 6):2009")).toBe("302");
    expect(normalizedNumberOf("IS 302 (Part 2/Sec 26):2014")).toBe("302");
  });

  test("handles a number with no edition year", () => {
    expect(normalizedNumberOf("IS 1786")).toBe("1786");
  });
});
