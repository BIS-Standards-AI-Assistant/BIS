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

  test("laboratory-flavored question classifies as laboratories, not testing or certification", () => {
    expect(classifyChatIntent("Where can I find a laboratory to test this?")).toBe("laboratories");
    expect(classifyChatIntent("Which labs can test my product?")).toBe("laboratories");
    expect(classifyChatIntent("Where can I get this tested?")).toBe("laboratories");
    expect(classifyChatIntent("Where can I get this certified?")).toBe("laboratories");
    expect(classifyChatIntent("Where can I do business related to this product?")).toBe("laboratories");
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
    const result = await buildScopedAnswer("why_relevant", "steel bottle", "why did this appear", []);
    expect(result.answer).toContain("don't have enough evidence");
    expect(result.evidence).toEqual([]);
  });

  test("'other' sub-intent with real scoped standards still refuses rather than guessing", async () => {
    const result = await buildScopedAnswer(
      "other",
      "steel bottle",
      "what does this actually require",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks: [] }],
    );
    expect(result.answer).toContain("don't have enough evidence");
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  test("'other' sub-intent checks the live follow-up message, not the original search, for off-topic content", async () => {
    // Regression test: buildFreeformAnswer used to receive only
    // originalQuery and never saw the reader's actual new question, so an
    // off-topic follow-up ("tell me a joke") mid-conversation about an
    // on-topic search ("steel bottle") would silently re-describe the
    // original search's evidence instead of refusing. The message itself
    // must now drive both the off-topic gate and the answer.
    const result = await buildScopedAnswer(
      "other",
      "steel bottle",
      "tell me a joke",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks: [] }],
    );
    expect(result.answer).toContain("outside what BIS Standards Navigator covers");
    expect(result.limitations[0]).toContain("outside the scope");
  });

  test("'other' sub-intent does NOT false-positive-refuse an ambiguous-alone but on-topic follow-up", async () => {
    // Regression test: an earlier version of this gate ran a full LLM
    // relevance judgment on the bare message with no conversation context,
    // and a pronoun-heavy on-topic follow-up ("this thing" = the helmet
    // under discussion) was misjudged as off-topic in isolation. The gate
    // is now a fixed keyword check (OFF_TOPIC_PATTERN), which this
    // question correctly does not match.
    const result = await buildScopedAnswer(
      "other",
      "helmets for two wheeler riders",
      "how heavy is this thing allowed to be?",
      [{ standardId: "s1", standardNumber: "IS 4151:2015", title: "Protective Helmet", chunks: [] }],
    );
    expect(result.answer).not.toContain("outside what BIS Standards Navigator covers");
  });

  test("deterministic sub-intents (why_relevant/evidence/certification/testing/missing_info) always answer 'en' regardless of the requested language — their text is always built from English evidence fields", async () => {
    const scoped = [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks: [] }];
    for (const subIntent of ["why_relevant", "evidence", "certification", "testing", "missing_info"] as const) {
      const result = await buildScopedAnswer(subIntent, "steel bottle", "a follow-up", scoped, "hi");
      expect(result.answerLanguage).toBe("en");
    }
  });

  test("empty scoped context answers 'en' regardless of requested language", async () => {
    const result = await buildScopedAnswer("why_relevant", "steel bottle", "why did this appear", [], "hi");
    expect(result.answerLanguage).toBe("en");
  });

  test("'other' sub-intent with no provider available falls back to 'en', never claiming a language it didn't actually answer in", async () => {
    const result = await buildScopedAnswer(
      "other",
      "steel bottle",
      "what does this actually require",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks: [] }],
      "hi",
    );
    expect(result.answerLanguage).toBe("en");
  });

  test("omitting the language argument defaults to English", async () => {
    const result = await buildScopedAnswer("why_relevant", "steel bottle", "why did this appear", []);
    expect(result.answerLanguage).toBe("en");
  });

  test("evidence sub-intent with no indexed chunks does not fabricate an excerpt", async () => {
    const result = await buildScopedAnswer(
      "evidence",
      "steel bottle",
      "show me the evidence",
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
      "show me the evidence",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks }],
    );
    expect(result.evidence.length).toBe(3);
    expect(result.evidence[0].standardNumber).toBe("IS 15410:2003");
  });

  test("why_relevant with a real chunk quotes it, never invents a reason", async () => {
    const result = await buildScopedAnswer(
      "why_relevant",
      "steel bottle",
      "why did this appear",
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
