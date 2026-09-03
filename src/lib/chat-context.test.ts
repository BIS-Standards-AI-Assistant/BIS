import { describe, test, expect } from "vitest";
import { classifyChatIntent, buildScopedAnswer } from "./chat-context";

describe("classifyChatIntent", () => {
  test("explicit wider-search phrasing classifies as wider_search", () => {
    expect(classifyChatIntent("Find other standards like this")).toBe("wider_search");
    expect(classifyChatIntent("search wider BIS knowledge")).toBe("wider_search");
    expect(classifyChatIntent("are there different standards for this?")).toBe("wider_search");
  });

  test("'why did the first result appear' classifies as why_relevant", () => {
    expect(classifyChatIntent("Why did the first result appear?")).toBe("why_relevant");
    expect(classifyChatIntent("What makes this relevant?")).toBe("why_relevant");
  });

  test("'show me the evidence' classifies as evidence", () => {
    expect(classifyChatIntent("Show me the evidence.")).toBe("evidence");
    expect(classifyChatIntent("What sources support this?")).toBe("evidence");
  });

  test("'what information is missing' classifies as missing_info", () => {
    expect(classifyChatIntent("What information is missing?")).toBe("missing_info");
  });

  test("certification-flavored question classifies as certification", () => {
    expect(classifyChatIntent("How do I get BIS certification for this?")).toBe("certification");
  });

  test("testing-flavored question classifies as testing", () => {
    expect(classifyChatIntent("What tests are required?")).toBe("testing");
  });

  test("an unrelated/unclassifiable question falls through to other", () => {
    expect(classifyChatIntent("What color is the sky")).toBe("other");
  });

  test("wider_search takes priority even when testing words are also present", () => {
    expect(classifyChatIntent("find other standards with testing requirements")).toBe("wider_search");
  });
});

describe("buildScopedAnswer", () => {
  test("empty scoped context never fabricates — returns the honest 'not enough evidence' answer", async () => {
    const result = await buildScopedAnswer("why_relevant", "steel bottle", []);
    expect(result.answer).toContain("don't have enough evidence");
    expect(result.evidence).toEqual([]);
  });

  test("'other' sub-intent with real scoped standards still refuses rather than guessing", async () => {
    const result = await buildScopedAnswer(
      "other",
      "steel bottle",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks: [] }],
    );
    expect(result.answer).toContain("don't have enough evidence");
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  test("evidence sub-intent with no indexed chunks does not fabricate an excerpt", async () => {
    const result = await buildScopedAnswer(
      "evidence",
      "steel bottle",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks: [] }],
    );
    expect(result.evidence).toEqual([]);
    expect(result.answer).toContain("don't have enough evidence");
  });

  test("evidence sub-intent with real chunks returns them verbatim, capped per standard", async () => {
    const chunks = Array.from({ length: 5 }, (_, i) => ({
      chunkId: `c${i}`,
      documentId: "d1",
      documentTitle: "Doc",
      sourceUrl: "https://bis.gov.in/x.pdf",
      section: null,
      clause: null,
      page: null,
      text: `chunk ${i}`,
    }));
    const result = await buildScopedAnswer(
      "evidence",
      "steel bottle",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks }],
    );
    expect(result.evidence.length).toBe(3);
    expect(result.evidence[0].standardNumber).toBe("IS 15410:2003");
  });

  test("why_relevant with a real chunk quotes it, never invents a reason", async () => {
    const result = await buildScopedAnswer(
      "why_relevant",
      "steel bottle",
      [
        {
          standardId: "s1",
          standardNumber: "IS 15410:2003",
          title: "Plastics Bottles",
          chunks: [
            {
              chunkId: "c1",
              documentId: "d1",
              documentTitle: "Doc",
              sourceUrl: "https://bis.gov.in/x.pdf",
              section: null,
              clause: null,
              page: null,
              text: "packaged natural mineral water containers",
            },
          ],
        },
      ],
    );
    expect(result.answer).toContain("packaged natural mineral water containers");
    expect(result.answer).toContain("IS 15410:2003");
  });
});
