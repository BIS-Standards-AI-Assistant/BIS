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

  test("throws a clear, actionable error instead of a deep driver failure when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    const { getDb } = await import("./index");
    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
  });
});
