import { describe, test, expect } from "vitest";
import { dcg, ndcgAtK, recallAtK, reciprocalRank } from "./ml-evaluate";

describe("recallAtK", () => {
  test("true when every expected standard appears within the top K", () => {
    expect(recallAtK(["IS 1:2020", "IS 2:2020"], new Set(["IS 1:2020"]), 5)).toBe(true);
  });

  test("false when an expected standard falls outside the top K", () => {
    expect(recallAtK(["IS 2:2020", "IS 3:2020", "IS 1:2020"], new Set(["IS 1:2020"]), 2)).toBe(false);
  });

  test("null entries (no standard for a chunk) never count as a match", () => {
    expect(recallAtK([null, null], new Set(["IS 1:2020"]), 5)).toBe(false);
  });
});

describe("reciprocalRank", () => {
  test("1.0 when the expected standard is first", () => {
    expect(reciprocalRank(["IS 1:2020", "IS 2:2020"], new Set(["IS 1:2020"]))).toBe(1);
  });

  test("1/3 when the expected standard is third", () => {
    expect(reciprocalRank(["IS 2:2020", "IS 3:2020", "IS 1:2020"], new Set(["IS 1:2020"]))).toBeCloseTo(1 / 3);
  });

  test("0 when the expected standard never appears", () => {
    expect(reciprocalRank(["IS 2:2020", "IS 3:2020"], new Set(["IS 1:2020"]))).toBe(0);
  });
});

describe("dcg / ndcgAtK", () => {
  test("dcg of an all-zero relevance list is 0", () => {
    expect(dcg([0, 0, 0])).toBe(0);
  });

  test("ndcgAtK is 1.0 for a perfect ranking (expected standard first)", () => {
    expect(ndcgAtK(["IS 1:2020", "IS 2:2020"], new Set(["IS 1:2020"]), 5)).toBeCloseTo(1);
  });

  test("ndcgAtK is 0 when the expected standard never appears in the top K", () => {
    expect(ndcgAtK(["IS 2:2020", "IS 3:2020"], new Set(["IS 1:2020"]), 5)).toBe(0);
  });

  test("ndcgAtK penalizes a correct-but-lower rank relative to a perfect one", () => {
    const perfect = ndcgAtK(["IS 1:2020", "IS 2:2020"], new Set(["IS 1:2020"]), 5);
    const laterRank = ndcgAtK(["IS 2:2020", "IS 1:2020"], new Set(["IS 1:2020"]), 5);
    expect(laterRank).toBeLessThan(perfect);
  });

  test("ndcgAtK is 0 (not NaN) when there is no expected standard at all", () => {
    expect(ndcgAtK(["IS 1:2020"], new Set(), 5)).toBe(0);
  });
});
