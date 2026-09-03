import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";
import { retrieveChunks, getLocalSeedChunks, slugifyStandardNumber } from "./retrieval";

// These tests run without DATABASE_URL set (vitest.config.ts loads no env
// file), so retrieveChunks exercises the local-seed fallback path used
// whenever Postgres/Neon is unconfigured or unreachable — the same path a
// real request hits when the DB is down. See src/app/standards/[id]/page.tsx
// step 3, which resolves a Standard Passport URL by this exact slug.

describe("slugifyStandardNumber", () => {
  test("matches the manifest filename slug for every seed document", () => {
    const manifestPath = path.join(process.cwd(), "data", "seed", "manifest.json");
    const manifest: Array<{ file: string; standardNumber: string }> = JSON.parse(
      fs.readFileSync(manifestPath, "utf-8"),
    );
    expect(manifest.length).toBeGreaterThan(0);
    for (const item of manifest) {
      const fileSlug = item.file.replace(/\.txt$/, "");
      expect(slugifyStandardNumber(item.standardNumber)).toBe(fileSlug);
    }
  });
});

describe("retrieveChunks (local seed fallback, no DATABASE_URL)", () => {
  test("every result's documentId is the slug of its standardNumber, never the raw string", async () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
    const results = await retrieveChunks("stainless steel utensils");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.standardNumber).toBeTruthy();
      expect(r.documentId).toBe(slugifyStandardNumber(r.standardNumber!));
      // A raw standard number contains a space/colon and would 404 as a
      // Standard Passport link (src/components/standards/RecommendationCard.tsx
      // builds `/standards/${documentId}` directly, with no further encoding).
      expect(r.documentId).not.toMatch(/[\s:]/);
    }
  });

  test("a fallback result's documentId resolves against the same seed data the Standard Passport page reads", async () => {
    const results = await retrieveChunks("stainless steel utensils");
    const seedStandardNumbers = new Set(getLocalSeedChunks().map((c) => c.doc.standardNumber));
    for (const r of results) {
      expect(seedStandardNumbers.has(r.standardNumber!)).toBe(true);
    }
  });
});
