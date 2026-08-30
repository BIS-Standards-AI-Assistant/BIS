// @vitest-environment node
import { describe, test, expect } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

function req(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/v1/certification-schemes", () => {
  test("returns items sourced only from the real fact-checked dataset — no fabricated standard numbers", async () => {
    const res = await GET(req("http://localhost/api/v1/certification-schemes"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.total).toBe(22); // the real dataset's known entry count
    for (const item of body.items) {
      expect(item.standardNumber).toMatch(/^IS \d/);
      expect(item.sourceUrl === null || typeof item.sourceUrl === "string").toBe(true);
    }
  });

  test("q filter narrows results to actual matches, never invents a match", async () => {
    const res = await GET(req("http://localhost/api/v1/certification-schemes?q=nonexistent-product-xyz"));
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  test("q filter matches a known real entry (IS 1786 reinforcement steel bars)", async () => {
    const res = await GET(req("http://localhost/api/v1/certification-schemes?q=deformed steel bars"));
    const body = await res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.items.some((i: { standardNumber: string }) => i.standardNumber.includes("1786"))).toBe(true);
  });

  test("every returned item carries a verification_status field from the source data (provenance never dropped)", async () => {
    const res = await GET(req("http://localhost/api/v1/certification-schemes"));
    const body = await res.json();
    for (const item of body.items) {
      expect(typeof item.verificationStatus === "string" || item.verificationStatus === null).toBe(true);
    }
  });

  test("sector filter only returns entries whose category actually contains the term", async () => {
    const allRes = await GET(req("http://localhost/api/v1/certification-schemes"));
    const all = await allRes.json();
    const sector = all.sectors[0];
    const res = await GET(req(`http://localhost/api/v1/certification-schemes?sector=${encodeURIComponent(sector)}`));
    const body = await res.json();
    for (const item of body.items) {
      expect(item.category?.toLowerCase()).toContain(sector.toLowerCase());
    }
  });
});
