import { describe, test, expect } from "vitest";
import { analyzeDocumentText } from "./document-analyzer";

// These tests run without DATABASE_URL set (vitest.config.ts loads no env
// file — see src/lib/retrieval.test.ts's own note), so only the early
// pure-function path (no DB call reached) is exercised here. The
// DB-dependent path (identifier -> real standards row -> scoped evidence)
// is covered by this session's live verification against the real
// database, matching this project's existing convention for DB-backed
// modules.
describe("analyzeDocumentText — pure/no-DB paths", () => {
  test("text too short to extract anything never reaches the database, returns an honest limitation", async () => {
    const result = await analyzeDocumentText("hi");
    expect(result.identifiersFound).toEqual([]);
    expect(result.standards).toEqual([]);
    expect(result.limitations[0]).toContain("Not enough extractable text");
  });

  test("empty string is handled the same way, not a crash", async () => {
    const result = await analyzeDocumentText("");
    expect(result.extractedChars).toBe(0);
    expect(result.limitations.length).toBeGreaterThan(0);
  });
});
