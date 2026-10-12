// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { __resetRateLimitsForTests } from "@/lib/rate-limit-http";
import { POST as query } from "./query/route";
import { POST as chat } from "./chat/route";
import { POST as analyzeProduct } from "./analyze-product/route";

// A failure deep in the pipeline: the kind of message a provider SDK or
// database driver actually produces, with details a client must not see.
const SECRET_DETAIL = 'Incorrect API key provided: sk-or-v1-abc123 (host ep-cool-host.neon.tech, user "neondb_owner")';

const runQueryPipeline = vi.fn();
vi.mock("@/lib/query-pipeline", () => ({ runQueryPipeline: (...a: unknown[]) => runQueryPipeline(...a) }));
vi.mock("@/lib/chat-context", () => ({
  classifyChatIntent: () => "wider_search",
  resolveScopedContext: vi.fn(),
  buildScopedAnswer: vi.fn(),
}));

function post(body: unknown) {
  return new NextRequest(new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  __resetRateLimitsForTests();
  runQueryPipeline.mockReset();
  runQueryPipeline.mockRejectedValue(new Error(SECRET_DETAIL));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe.each([
  ["/query", () => query(post({ query: "helmets" })), "Query processing failed"],
  ["/chat", () => chat(post({ originalQuery: "helmets", message: "search more widely" })), "Chat processing failed"],
  ["/analyze-product", () => analyzeProduct(post({ productDescription: "steel water bottle" })), "Product analysis failed"],
] as const)("%s", (_name, call, error) => {
  test("a pipeline failure is a 500 with a generic error and no internal detail", async () => {
    const res = await call();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error });
    expect(JSON.stringify(body)).not.toMatch(/sk-or-v1|neon\.tech|neondb_owner|API key/);
  });

  test("the real error is still logged server-side", async () => {
    await call();
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^\[api\/v1\//), expect.any(Error));
  });
});
