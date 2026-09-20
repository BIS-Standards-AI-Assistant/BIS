import { describe, test, expect } from "vitest";
import { classifyChatIntent, buildScopedAnswer, buildEvidenceOnlyFollowUp } from "./chat-context";

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

  test("'other' sub-intent with no indexed passage to answer from says so, names what is indexed, and invents nothing", async () => {
    // With no provider configured this lands in the evidence-only path.
    // It used to be a flat "I don't have enough evidence", which told the
    // reader the corpus was empty-handed when in fact no model had been
    // reachable. It must still never answer the question itself.
    const result = await buildScopedAnswer(
      "other",
      "steel bottle",
      "what does this actually require",
      [{ standardId: "s1", standardNumber: "IS 15410:2003", title: "Plastics Bottles", chunks: [] }],
    );
    expect(result.answer).toContain("IS 15410:2003");
    expect(result.answer).toContain("No passage in the indexed text");
    expect(result.evidence).toEqual([]);
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  test("a market/competitor follow-up gets the corpus boundary, never invented market facts", async () => {
    for (const message of [
      "who are our current rival competitors",
      "current rival competitors",
      "what is the market share of this product",
      "best location to manufacture this",
      "best manufacturing location",
      "where should I set up a factory for this",
    ]) {
      const result = await buildScopedAnswer("other", "helmet standards", message, [
        { standardId: "s1", standardNumber: "IS 4151:2015", title: "Protective Helmet", chunks: [] },
      ]);
      expect(result.answer).toContain("no market, competitor, pricing or site-selection data");
      expect(result.answer).toContain("IS 4151:2015");
      expect(result.limitations[0]).toContain("outside the indexed BIS corpus");
    }
  });

  test("an on-topic question about the product is NOT treated as a market question", async () => {
    // "where" and "location" appear in legitimate compliance questions too
    // — the boundary pattern must not swallow them.
    const scoped = [{ standardId: "s1", standardNumber: "IS 4151:2015", title: "Protective Helmet", chunks: [] }];
    for (const message of [
      "where is the ISI mark placed on the shell",
      "what impact absorption is required",
      "best place for the ISI mark on the shell",
      "what testing is required before production",
    ]) {
      const result = await buildScopedAnswer("other", "helmet standards", message, scoped);
      expect(result.answer).not.toContain("no market, competitor, pricing or site-selection data");
    }
  });
});

describe("buildEvidenceOnlyFollowUp", () => {
  const chunk = (id: string, text: string, clause: string | null = null) => ({
    chunkId: id,
    documentId: "d1",
    documentTitle: "Product Manual",
    sourceUrl: "https://bis.gov.in/x.pdf",
    section: null,
    clause,
    page: 4,
    text,
  });

  test("quotes the indexed passages that mention the question, verbatim and with their citation", () => {
    const result = buildEvidenceOnlyFollowUp("what shell thickness is required", [
      {
        standardId: "s1",
        standardNumber: "IS 4151:2015",
        title: "Protective Helmet",
        chunks: [
          chunk("c1", "The shell thickness shall be not less than 2.0 mm at any point.", "6.1"),
          chunk("c2", "Chin strap anchorage shall withstand the specified load.", "7.2"),
        ],
      },
    ]);
    expect(result.evidence.length).toBe(1);
    expect(result.evidence[0].text).toBe("The shell thickness shall be not less than 2.0 mm at any point.");
    expect(result.evidence[0].clause).toBe("6.1");
    expect(result.evidence[0].standardNumber).toBe("IS 4151:2015");
    expect(result.limitations[0]).toContain("indexed evidence only");
  });

  test("ranks the passage that matches most of the question first and caps at three", () => {
    const result = buildEvidenceOnlyFollowUp("impact absorption test temperature", [
      {
        standardId: "s1",
        standardNumber: "IS 4151:2015",
        title: "Protective Helmet",
        chunks: [
          chunk("c1", "Temperature conditioning is specified."),
          chunk("c2", "The impact absorption test shall be carried out at the stated temperature."),
          chunk("c3", "Impact points are defined on the shell."),
          chunk("c4", "Absorption of impact energy is measured."),
          chunk("c5", "No mention of the subject here."),
        ],
      },
    ]);
    expect(result.evidence[0].chunkId).toBe("c2");
    expect(result.evidence.length).toBe(3);
  });

  test("a testing question with no structured scheme record still answers from the document's own text", async () => {
    // The certification/testing reference tables are a separate dataset
    // from the ingested documents; with the tables empty this branch used
    // to stop at "no record" even though the product manual text answers
    // the question. It must quote the text and still disclose which of the
    // two the reader is looking at.
    const result = await buildScopedAnswer("testing", "helmet standards", "what testing is required", [
      {
        standardId: "s1",
        standardNumber: "IS 4151:2015",
        title: "Protective Helmet",
        chunks: [
          {
            chunkId: "c1",
            documentId: "d1",
            documentTitle: "Product Manual",
            sourceUrl: "https://bis.gov.in/x.pdf",
            section: "Scheme of Inspection and Testing",
            clause: "A-1",
            page: 9,
            text: "Each helmet shall be subjected to the impact absorption testing specified in the scheme.",
          },
        ],
      },
    ]);
    expect(result.answer).toContain("no certification scheme record is indexed");
    expect(result.evidence.length).toBe(1);
    expect(result.evidence[0].clause).toBe("A-1");
    expect(result.limitations[0]).toContain("No structured certification or testing record");
  });

  test("when nothing in the indexed text mentions the question it says so rather than quoting something irrelevant", () => {
    const result = buildEvidenceOnlyFollowUp("what does the warranty period cover", [
      {
        standardId: "s1",
        standardNumber: "IS 4151:2015",
        title: "Protective Helmet",
        chunks: [chunk("c1", "The shell shall be moulded in one piece.", "6.1")],
      },
    ]);
    expect(result.evidence).toEqual([]);
    expect(result.answer).toContain("No passage in the indexed text");
    expect(result.answer).toContain("indexed clauses include 6.1");
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
