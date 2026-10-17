// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const standardsFindMany = vi.fn();
const documentsFindMany = vi.fn();
vi.mock("@/db", () => ({
  getDb: () => ({
    query: {
      standards: { findMany: standardsFindMany },
      documents: { findMany: documentsFindMany },
    },
  }),
}));

import { resolveScopedContext } from "./chat-context";

const doc = (over: Record<string, unknown> = {}) => ({
  id: "doc-1",
  title: "Plastics Bottles",
  sourceUrl: "https://www.bis.gov.in/x",
  standardNumber: "IS 15410:2003",
  standardId: null,
  chunks: [{ id: "c1", section: "4", clause: "4.1", page: 3, text: "Bottles shall be food grade." }],
  ...over,
});

beforeEach(() => {
  standardsFindMany.mockReset();
  documentsFindMany.mockReset();
});

describe("resolveScopedContext: what it reads", () => {
  test("loads chunks without their embedding vectors, on both lookup paths", async () => {
    standardsFindMany.mockResolvedValue([{ id: "std-1", canonicalNumber: "IS 15410:2003", title: "Plastics Bottles" }]);
    documentsFindMany.mockResolvedValue([doc()]);

    await resolveScopedContext(["IS 15410:2003"]);

    expect(documentsFindMany).toHaveBeenCalledTimes(2);
    for (const [query] of documentsFindMany.mock.calls) {
      expect(query.with.chunks).toEqual({ columns: { embedding: false } });
    }
  });

  test("still returns each chunk's text and location", async () => {
    standardsFindMany.mockResolvedValue([]);
    documentsFindMany.mockResolvedValue([doc()]);

    const [scoped] = await resolveScopedContext(["IS 15410:2003"]);

    expect(scoped.standardNumber).toBe("IS 15410:2003");
    expect(scoped.chunks).toEqual([
      {
        chunkId: "c1",
        documentId: "doc-1",
        documentTitle: "Plastics Bottles",
        sourceUrl: "https://www.bis.gov.in/x",
        section: "4",
        clause: "4.1",
        page: 3,
        text: "Bottles shall be food grade.",
      },
    ]);
  });

  test("an empty scope reads nothing", async () => {
    expect(await resolveScopedContext([])).toEqual([]);
    expect(standardsFindMany).not.toHaveBeenCalled();
    expect(documentsFindMany).not.toHaveBeenCalled();
  });
});
