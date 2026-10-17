import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { getCachedResult, setCachedResult, MAX_CACHED_RESULTS } from "./query-cache";
import type { QueryResponse } from "@/types/api";

const result = (answer: string) => ({ answer, recommendations: [] }) as unknown as QueryResponse;

beforeEach(() => {
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("query cache", () => {
  test("returns what was stored for the same query and language", () => {
    setCachedResult("helmet", "en", result("English answer"));
    expect(getCachedResult("helmet", "en")?.answer).toBe("English answer");
  });

  test("a result is not served for the same query in another language", () => {
    setCachedResult("helmet", "en", result("English answer"));
    expect(getCachedResult("helmet", "hi")).toBeNull();

    setCachedResult("helmet", "hi", result("हिंदी उत्तर"));
    expect(getCachedResult("helmet", "hi")?.answer).toBe("हिंदी उत्तर");
    expect(getCachedResult("helmet", "en")?.answer).toBe("English answer");
  });

  test("fallback answers are never cached, and are dropped if found", () => {
    setCachedResult("q", "en", result("No AI-generated explanation is available."));
    expect(getCachedResult("q", "en")).toBeNull();

    sessionStorage.setItem("bis-query-cache:en:old", JSON.stringify(result("No AI-generated explanation")));
    expect(getCachedResult("old", "en")).toBeNull();
    expect(sessionStorage.getItem("bis-query-cache:en:old")).toBeNull();
  });

  test(`keeps at most ${MAX_CACHED_RESULTS} results, evicting the oldest`, () => {
    for (let i = 0; i < MAX_CACHED_RESULTS + 5; i++) setCachedResult(`q${i}`, "en", result(`a${i}`));
    const cached = Object.keys(sessionStorage).filter((k) => k.startsWith("bis-query-cache:en:"));
    expect(cached).toHaveLength(MAX_CACHED_RESULTS);
    expect(getCachedResult("q0", "en")).toBeNull();
    expect(getCachedResult("q4", "en")).toBeNull();
    expect(getCachedResult("q5", "en")?.answer).toBe("a5");
    expect(getCachedResult(`q${MAX_CACHED_RESULTS + 4}`, "en")).not.toBeNull();
  });

  test("re-storing a query refreshes it rather than duplicating it", () => {
    setCachedResult("a", "en", result("1"));
    for (let i = 0; i < MAX_CACHED_RESULTS - 1; i++) setCachedResult(`q${i}`, "en", result("x"));
    setCachedResult("a", "en", result("2")); // now the newest
    setCachedResult("one-more", "en", result("y")); // evicts q0, not a
    expect(getCachedResult("a", "en")?.answer).toBe("2");
    expect(getCachedResult("q0", "en")).toBeNull();
  });

  test("on a full quota, older results are dropped to make room", () => {
    setCachedResult("old1", "en", result("o1"));
    setCachedResult("old2", "en", result("o2"));
    const real = Storage.prototype.setItem;
    let failures = 1;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.startsWith("bis-query-cache:") && failures-- > 0) throw new DOMException("full", "QuotaExceededError");
      return real.call(this, k, v);
    });
    setCachedResult("new", "en", result("n"));
    expect(getCachedResult("new", "en")?.answer).toBe("n");
    expect(getCachedResult("old1", "en")).toBeNull();
    expect(getCachedResult("old2", "en")?.answer).toBe("o2");
  });

  test("storage that always refuses writes is not an error", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => setCachedResult("q", "en", result("a"))).not.toThrow();
  });
});
