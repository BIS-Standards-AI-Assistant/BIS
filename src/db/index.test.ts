// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("getDb — DATABASE_URL validation", () => {
  const original = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  // vi.resetModules() makes this a cold import of the DB module and its
  // driver, which can exceed vitest's 5s default when the whole suite runs
  // in parallel on a slower machine. The assertion itself is instant.
  test("throws a clear, actionable error instead of a deep driver failure when DATABASE_URL is unset", { timeout: 30_000 }, async () => {
    delete process.env.DATABASE_URL;
    const { getDb } = await import("./index");
    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
  });
});
