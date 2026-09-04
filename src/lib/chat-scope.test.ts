import { describe, test, expect } from "vitest";
import { buildChatScope, MAX_SCOPE_STANDARDS } from "@/lib/chat-scope";

const many = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix} ${i}`);

describe("buildChatScope — the reader's own sources are never crowded out", () => {
  test("a source standard survives even when results fill the limit", () => {
    const scope = buildChatScope(["IS 2347:2017"], many("IS R", 12));
    expect(scope.standardNumbers[0]).toBe("IS 2347:2017");
    expect(scope.standardNumbers).toHaveLength(MAX_SCOPE_STANDARDS);
    expect(scope.fromSources).toBe(1);
    // The regression this exists to prevent: results-first truncation
    // dropped the added source entirely.
    expect(scope.standardNumbers).toContain("IS 2347:2017");
  });

  test("every added source is kept, and results take only what is left", () => {
    const scope = buildChatScope(many("IS S", 4), many("IS R", 20));
    expect(scope.standardNumbers.slice(0, 4)).toEqual(many("IS S", 4));
    expect(scope.standardNumbers).toHaveLength(10);
    expect(scope.fromSources).toBe(4);
    expect(scope.droppedResults).toBe(14);
  });

  test("reports how many results were dropped, so the UI can say so", () => {
    expect(buildChatScope([], many("IS R", 13)).droppedResults).toBe(3);
    expect(buildChatScope([], many("IS R", 5)).droppedResults).toBe(0);
  });

  test("a standard in both is counted once, as a source", () => {
    const scope = buildChatScope(["IS 2347:2017"], ["IS 2347:2017", "IS 4151:2015"]);
    expect(scope.standardNumbers).toEqual(["IS 2347:2017", "IS 4151:2015"]);
    expect(scope.fromSources).toBe(1);
  });

  test("duplicates within either list collapse", () => {
    const scope = buildChatScope(["IS 1:2020", "IS 1:2020"], ["IS 2:2020", "IS 2:2020"]);
    expect(scope.standardNumbers).toEqual(["IS 1:2020", "IS 2:2020"]);
  });

  test("no sources means results behave exactly as before", () => {
    const scope = buildChatScope([], ["IS 1:2020", "IS 2:2020"]);
    expect(scope).toEqual({ standardNumbers: ["IS 1:2020", "IS 2:2020"], fromSources: 0, droppedResults: 0 });
  });

  test("no results means the sources alone are the scope", () => {
    expect(buildChatScope(["IS 1:2020"], []).standardNumbers).toEqual(["IS 1:2020"]);
  });

  test("an empty library and empty results yield an empty scope, not a crash", () => {
    expect(buildChatScope([], [])).toEqual({ standardNumbers: [], fromSources: 0, droppedResults: 0 });
  });

  test("more sources than the API ceiling are capped, and the count stays truthful", () => {
    const scope = buildChatScope(many("IS S", 14), ["IS R 1"]);
    expect(scope.standardNumbers).toHaveLength(10);
    expect(scope.fromSources).toBe(10);
    // No room was left for results, and that is reported rather than hidden.
    expect(scope.droppedResults).toBe(1);
  });

  test("never exceeds the limit the chat route enforces", () => {
    for (const [s, r] of [[0, 0], [1, 30], [10, 10], [30, 30], [5, 2]] as const) {
      expect(buildChatScope(many("S", s), many("R", r)).standardNumbers.length).toBeLessThanOrEqual(MAX_SCOPE_STANDARDS);
    }
  });
});
