import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  addRecentQuery,
  clearRecentQueries,
  getRecentQueries,
  getRecentQueriesSnapshot,
  getRecentQueriesServerSnapshot,
  subscribeToRecentQueries,
  type RecentQueryEntry,
} from "./recent-queries";

const KEY = "bis-recent-queries";

function entry(query: string, timestamp = 0): RecentQueryEntry {
  return { query, standardNumbers: [], confidence: "high", timestamp };
}

beforeEach(() => {
  clearRecentQueries();
  vi.restoreAllMocks();
});

describe("addRecentQuery / getRecentQueries", () => {
  test("starts empty", () => {
    expect(getRecentQueries()).toEqual([]);
  });

  test("newest query is first", () => {
    addRecentQuery(entry("cement", 1));
    addRecentQuery(entry("helmet", 2));
    expect(getRecentQueries().map((e) => e.query)).toEqual(["helmet", "cement"]);
  });

  test("re-running a query moves it to the top instead of duplicating it, case-insensitively", () => {
    addRecentQuery(entry("LED bulb", 1));
    addRecentQuery(entry("cement", 2));
    addRecentQuery(entry("led BULB", 3));
    expect(getRecentQueries().map((e) => e.query)).toEqual(["led BULB", "cement"]);
  });

  test("keeps at most ten entries, dropping the oldest", () => {
    for (let i = 0; i < 15; i++) addRecentQuery(entry(`q${i}`, i));
    const queries = getRecentQueries().map((e) => e.query);
    expect(queries).toHaveLength(10);
    expect(queries[0]).toBe("q14");
    expect(queries.at(-1)).toBe("q5");
  });

  test("notifies same-tab listeners after each add", () => {
    const listener = vi.fn();
    window.addEventListener("bis-queries-updated", listener);
    addRecentQuery(entry("cement"));
    window.removeEventListener("bis-queries-updated", listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("malformed stored JSON reads as empty history rather than throwing", () => {
    localStorage.setItem(KEY, "{not json");
    expect(getRecentQueries()).toEqual([]);
    expect(() => addRecentQuery(entry("cement"))).not.toThrow();
  });

  test("storage that throws is treated as non-critical", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(getRecentQueries()).toEqual([]);
    expect(() => addRecentQuery(entry("cement"))).not.toThrow();
    expect(getRecentQueriesSnapshot()).toEqual([]);
  });
});

describe("clearRecentQueries", () => {
  test("removes history and wakes subscribers", () => {
    addRecentQuery(entry("cement"));
    const listener = vi.fn();
    const unsubscribe = subscribeToRecentQueries(listener);
    clearRecentQueries();
    unsubscribe();
    expect(getRecentQueries()).toEqual([]);
    expect(getRecentQueriesSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("useSyncExternalStore bindings", () => {
  test("the snapshot is referentially stable until storage actually changes", () => {
    addRecentQuery(entry("cement"));
    const first = getRecentQueriesSnapshot();
    expect(getRecentQueriesSnapshot()).toBe(first);

    addRecentQuery(entry("helmet"));
    const second = getRecentQueriesSnapshot();
    expect(second).not.toBe(first);
    expect(second.map((e) => e.query)).toEqual(["helmet", "cement"]);
  });

  test("a stored non-array value snapshots as empty", () => {
    localStorage.setItem(KEY, JSON.stringify({ query: "cement" }));
    expect(getRecentQueriesSnapshot()).toEqual([]);
  });

  test("the server snapshot is always the same empty list, so hydration never mismatches", () => {
    addRecentQuery(entry("cement"));
    expect(getRecentQueriesServerSnapshot()).toEqual([]);
    expect(getRecentQueriesServerSnapshot()).toBe(getRecentQueriesServerSnapshot());
  });

  test("subscribers hear cross-tab storage events and stop after unsubscribing", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToRecentQueries(listener);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("bis-queries-updated"));
    unsubscribe();
    window.dispatchEvent(new Event("storage"));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
