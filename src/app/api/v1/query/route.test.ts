// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const runQueryPipeline = vi.fn();
vi.mock("@/lib/query-pipeline", () => ({ runQueryPipeline: (...args: unknown[]) => runQueryPipeline(...args) }));
vi.mock("@/lib/rate-limit-http", () => ({ rateLimitOrNull: () => null }));

import { POST } from "./route";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  runQueryPipeline.mockReset().mockResolvedValue({ answer: "ok" });
});

describe("POST /api/v1/query — language", () => {
  test("a supported language is passed to the pipeline", async () => {
    const res = await post({ query: "helmet", language: "hi" });
    expect(res.status).toBe(200);
    expect(runQueryPipeline).toHaveBeenCalledWith("helmet", { debug: false, language: "hi" });
  });

  test("an unknown language is ignored, not a reason to reject the query", async () => {
    for (const language of ["pa", "EN", 42, null]) {
      runQueryPipeline.mockClear();
      const res = await post({ query: "helmet", language });
      expect(res.status, String(language)).toBe(200);
      expect(runQueryPipeline).toHaveBeenCalledWith("helmet", { debug: false, language: undefined });
    }
  });

  test("an invalid query is still rejected", async () => {
    const res = await post({ query: "", language: "hi" });
    expect(res.status).toBe(400);
    expect(runQueryPipeline).not.toHaveBeenCalled();
  });
});
