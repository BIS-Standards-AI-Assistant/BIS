import { describe, test, expect } from "vitest";
import { extractComplianceContext, hasSufficientContext } from "./context";
import type { AssistantMessage } from "@/lib/assistant-conversation";
import type { QueryResponse } from "@/types/api";

function msg(sender: "user" | "assistant", text: string): AssistantMessage {
  return { id: `${sender}-${text.slice(0, 6)}`, sender, text, timestamp: "10:00" };
}

function response(over: Partial<QueryResponse> = {}): QueryResponse {
  return {
    answer: "a",
    intent: "find_applicable_standard",
    interpretation: {
      product: null, material: null, useCase: null, targetUser: null,
      sector: null, certificationRequested: false, testingRequested: false,
    },
    recommendations: [],
    confidence: "high",
    limitations: [],
    conflicts: [],
    ...over,
  } as unknown as QueryResponse;
}

const rec = (standardNumber: string, over: Record<string, unknown> = {}) => ({
  standardNumber,
  title: "Some standard",
  reason: "r",
  relevanceScore: 0.9,
  groundingState: "verified",
  applicability: { state: "DIRECTLY_APPLICABLE", reason: "r" },
  coverage: {},
  evidence: [
    { chunkId: "c1", standardNumber, document: "Product Manual", clause: "5.2", page: 3, text: "t", sourceUrl: "https://www.bis.gov.in/x.pdf", documentId: "d1" },
  ],
  ...over,
});

describe("extractComplianceContext — every turn, not just the last (§54)", () => {
  test("carries facts stated across separate messages", () => {
    const ctx = extractComplianceContext(
      [msg("user", "I make a cable"), msg("assistant", "..."), msg("user", "It runs at 240V"), msg("user", "made of PVC"), msg("user", "for indoor installation")],
      response(),
      "cable",
    );
    expect(ctx.productDNA.electricalComponents?.value).toContain("240");
    expect(ctx.productDNA.material?.value).toBe("pvc");
    expect(ctx.productDNA.environment?.value).toBe("indoor");
  });

  test("reads the search itself as a user statement", () => {
    const ctx = extractComplianceContext([], response(), "stainless steel bottle for children");
    expect(ctx.productDNA.material?.value).toBe("stainless steel");
    expect(ctx.productDNA.userBase?.value).toBe("children");
    expect(ctx.productDNA.material?.provenance).toBe("user");
  });
});

describe("provenance is carried, not lost (§23, §65)", () => {
  test("what the user said is marked user-provided; what the pipeline read is marked AI", () => {
    const ctx = extractComplianceContext(
      [msg("user", "made of stainless steel")],
      response({ interpretation: { product: "water bottle", material: null, useCase: "drinking water", targetUser: null, sector: null, certificationRequested: false, testingRequested: false } }),
      "bottle",
    );
    expect(ctx.productDNA.material?.provenance).toBe("user");
    expect(ctx.productDNA.intendedUse?.provenance).toBe("ai");
    expect(ctx.product.name?.provenance).toBe("ai");
  });

  test("a user-stated axis is never overwritten by the pipeline's reading", () => {
    const ctx = extractComplianceContext(
      [msg("user", "made of stainless steel")],
      response({ interpretation: { product: null, material: "aluminium", useCase: null, targetUser: null, sector: null, certificationRequested: false, testingRequested: false } }),
      "",
    );
    expect(ctx.productDNA.material?.value).toBe("stainless steel");
  });
});

describe("conflicts are surfaced, never silently resolved (§55)", () => {
  test("two different voltages are reported as a conflict with the user's own words", () => {
    const ctx = extractComplianceContext(
      [msg("user", "it operates at 220V"), msg("user", "actually it operates at 440V")],
      response(),
      "",
    );
    const conflict = ctx.conflicts.find((c) => c.axis === "electricalComponents");
    expect(conflict).toBeDefined();
    expect(conflict!.values.length).toBe(2);
    expect(conflict!.excerpts[1]).toContain("440V");
  });

  test("a conflict blocks generation until it is resolved", () => {
    const ctx = extractComplianceContext(
      [msg("user", "220V"), msg("user", "440V")],
      response({ recommendations: [rec("IS 694:2010")] as never }),
      "cable",
    );
    expect(ctx.conflicts.length).toBeGreaterThan(0);
    expect(hasSufficientContext(ctx)).toBe(false);
  });
});

describe("standards come from retrieval, and the user's own are kept (§52)", () => {
  test("retrieved standards carry their real applicability and grounding", () => {
    const ctx = extractComplianceContext([], response({ recommendations: [rec("IS 15410:2003")] as never }), "bottle");
    expect(ctx.standards[0]).toMatchObject({ standardNumber: "IS 15410:2003", groundingState: "verified", userSpecified: false });
  });

  test("a standard the user names is flagged userSpecified rather than ignored", () => {
    const ctx = extractComplianceContext([msg("user", "I know that IS 15410:2003 applies")], response({ recommendations: [rec("IS 15410:2003")] as never }), "");
    expect(ctx.standards[0].userSpecified).toBe(true);
  });

  test("a user-named standard retrieval did not return is kept as unverified, not dropped", () => {
    const ctx = extractComplianceContext([msg("user", "surely IS 9999:2099 applies")], response(), "");
    const named = ctx.standards.find((s) => s.standardNumber === "IS 9999:2099");
    expect(named).toBeDefined();
    expect(named!.userSpecified).toBe(true);
    // It must not be presented as established.
    expect(named!.groundingState).toBe("insufficient_evidence");
  });
});

describe("missing information drives the questions (§7)", () => {
  test("axes with no value are listed, and stated ones are not", () => {
    const ctx = extractComplianceContext([], response(), "stainless steel bottle for children");
    expect(ctx.missing).not.toContain("material");
    expect(ctx.missing).not.toContain("userBase");
    expect(ctx.missing).toContain("manufacturingProcess");
    expect(ctx.missing).toContain("safetyCharacteristics");
  });

  test("nothing said means everything is asked, rather than assumed", () => {
    const ctx = extractComplianceContext([], response(), "");
    expect(ctx.missing).toHaveLength(8);
    expect(Object.keys(ctx.productDNA)).toHaveLength(0);
  });
});

describe("the extractor invents nothing", () => {
  test("an axis the user never mentioned stays absent", () => {
    const ctx = extractComplianceContext([msg("user", "a water bottle")], response(), "");
    expect(ctx.productDNA.material).toBeUndefined();
    expect(ctx.productDNA.manufacturingProcess).toBeUndefined();
  });

  test("the summary only restates the user's own words (§53)", () => {
    const ctx = extractComplianceContext([msg("user", "I make bottles"), msg("assistant", "IS 15410:2003 requires migration testing")], response(), "");
    expect(ctx.conversationSummary).toContain("I make bottles");
    // The assistant's claim must not become part of the user's stated context.
    expect(ctx.conversationSummary).not.toContain("migration testing");
  });

  test("evidence references keep their clause and source", () => {
    const ctx = extractComplianceContext([], response({ recommendations: [rec("IS 15410:2003")] as never }), "");
    expect(ctx.sourceReferences[0]).toMatchObject({ clause: "5.2", page: 3, sourceUrl: "https://www.bis.gov.in/x.pdf" });
  });
});

describe("user intent (§5)", () => {
  test.each([
    ["what testing do I need", "prepare_testing"],
    ["how do I apply for an ISI licence", "prepare_certification"],
    ["compare IS 1 and IS 2", "compare"],
    ["what standards apply", "understand"],
    ["", "unknown"],
  ])("%s -> %s", (text, expected) => {
    expect(extractComplianceContext([], response(), text).intent).toBe(expected);
  });
});

describe("sufficiency gate (§7)", () => {
  test("a named product with real standards and no conflict is enough to generate", () => {
    const ctx = extractComplianceContext([], response({ recommendations: [rec("IS 15410:2003")] as never }), "bottle");
    expect(hasSufficientContext(ctx)).toBe(true);
  });

  test("no standards means do not generate", () => {
    expect(hasSufficientContext(extractComplianceContext([], response(), "bottle"))).toBe(false);
  });
});
