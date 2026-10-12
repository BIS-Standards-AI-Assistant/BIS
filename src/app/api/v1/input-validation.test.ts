// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { __resetRateLimitsForTests } from "@/lib/rate-limit-http";
import { POST as query } from "./query/route";
import { POST as search } from "./search/route";
import { POST as chat } from "./chat/route";
import { POST as analyzeProduct } from "./analyze-product/route";
import { POST as speak } from "./speak/route";
import { POST as feedback } from "./feedback/route";
import { POST as findLaboratories } from "./find-laboratories/route";

// Every expensive or stateful dependency is mocked so a test can assert it
// was never reached: a blank request must be rejected before it spends an
// LLM call, a TTS character quota, a retrieval query or a database write.
const runQueryPipeline = vi.fn();
vi.mock("@/lib/query-pipeline", () => ({ runQueryPipeline: (...a: unknown[]) => runQueryPipeline(...a) }));
const retrieveChunks = vi.fn();
vi.mock("@/lib/retrieval", () => ({ retrieveChunks: (...a: unknown[]) => retrieveChunks(...a) }));
const synthesize = vi.fn();
vi.mock("@/lib/tts", () => ({ getTtsProvider: () => ({ synthesize, isConfigured: () => true }) }));
const insert = vi.fn();
vi.mock("@/db", () => ({ getDb: () => ({ insert }) }));
vi.mock("@/lib/chat-context", () => ({
  classifyChatIntent: vi.fn(),
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
  for (const fn of [runQueryPipeline, retrieveChunks, synthesize, insert]) fn.mockReset();
});

const BLANKS = ["", "   ", "\n\t "];

describe.each([
  ["/query", query, (v: string) => ({ query: v }), runQueryPipeline],
  ["/search", search, (v: string) => ({ query: v }), retrieveChunks],
  ["/chat (message)", chat, (v: string) => ({ originalQuery: "helmets", message: v }), runQueryPipeline],
  ["/chat (originalQuery)", chat, (v: string) => ({ originalQuery: v, message: "and testing?" }), runQueryPipeline],
  ["/analyze-product", analyzeProduct, (v: string) => ({ productDescription: v }), runQueryPipeline],
  ["/speak", speak, (v: string) => ({ text: v }), synthesize],
  ["/feedback (query)", feedback, (v: string) => ({ query: v, standardNumber: "IS 1293", reason: "other" }), insert],
  ["/feedback (standardNumber)", feedback, (v: string) => ({ query: "plugs", standardNumber: v, reason: "other" }), insert],
] as const)("%s", (_name, handler, body, dependency) => {
  test.each(BLANKS)("rejects a blank value %j with 400 before doing any work", async (blank) => {
    const res = await handler(post(body(blank)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
    expect(dependency).not.toHaveBeenCalled();
  });
});

describe("/find-laboratories", () => {
  test.each(BLANKS)("rejects a blank location %j instead of listing arbitrary laboratories", async (blank) => {
    const res = await findLaboratories(post({ location: blank }));
    expect(res.status).toBe(400);
  });

  test("a real location still matches, with surrounding spaces ignored", async () => {
    const res = await findLaboratories(post({ location: "  Maharashtra  " }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query.location).toBe("Maharashtra");
    expect(body.laboratories.length).toBeGreaterThan(0);
    expect(body.laboratories.every((l: { state: string }) => l.state === "Maharashtra")).toBe(true);
  });
});

describe("valid input is passed on trimmed", () => {
  test("/query hands the pipeline the trimmed query", async () => {
    runQueryPipeline.mockResolvedValue({ answer: "ok" });
    const res = await query(post({ query: "  helmets for two wheelers \n" }));
    expect(res.status).toBe(200);
    expect(runQueryPipeline.mock.calls[0][0]).toBe("helmets for two wheelers");
  });

  test("/search hands retrieval the trimmed query", async () => {
    retrieveChunks.mockResolvedValue([]);
    const res = await search(post({ query: " IS 14543 " }));
    expect(res.status).toBe(200);
    expect(retrieveChunks.mock.calls[0][0]).toBe("IS 14543");
  });
});
