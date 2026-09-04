import { describe, test, expect } from "vitest";
import { normalizeVoiceTranscript } from "./voice-normalizer";
import { normalizeQuery } from "@/lib/query-normalization";
import { extractQueryIntent } from "@/lib/intent";
import { assessApplicability } from "@/lib/applicability";
import { classifyKnowledgeBoundary } from "@/lib/knowledge-boundary";

describe("STT & RAG Pipeline Trust Integration", () => {
  test("voice input produces identical query normalization to equivalent typed query", () => {
    // Spoken query: "What is I.S. 14543:2016 for packaged drinking water"
    const voiceInput = "What is I.S. 14543:2016 for packaged drinking water";
    const voiceNormalized = normalizeVoiceTranscript(voiceInput);

    // Typed query
    const typedInput = "What is IS 14543:2016 for packaged drinking water";
    const typedNormalized = normalizeQuery(typedInput);

    const pipelineQueryFromVoice = normalizeQuery(voiceNormalized.normalizedQuery);

    expect(pipelineQueryFromVoice.normalizedQuery).toBe(typedNormalized.normalizedQuery);
    expect(pipelineQueryFromVoice.identifiers).toEqual(typedNormalized.identifiers);
  });

  test("unknown spoken standard code respects Knowledge Boundary (NOT_IN_DATABASE)", () => {
    const spokenTranscript = "आई एस 99999:2099 के नियम";
    const normalized = normalizeVoiceTranscript(spokenTranscript);
    expect(normalized.normalizedQuery).toBe("IS 99999:2099 के नियम");

    const queryNorm = normalizeQuery(normalized.normalizedQuery);
    expect(queryNorm.identifiers.some((i) => i.normalized === "IS 99999:2099")).toBe(true);

    // Classify knowledge boundary for an unindexed standard (no candidate)
    const boundary = classifyKnowledgeBoundary(null, null, [], null);

    expect(boundary.state).toBe("NOT_IN_DATABASE");
    expect(boundary.answerable).toBe(false);
    expect(boundary.knowledgeGap).toBe(true);
  });

  test("voice material query preserves applicability engine distinction (stainless steel vs plastic)", async () => {
    const spokenTranscript = "stainless steel drinking water bottle";
    const normalized = normalizeVoiceTranscript(spokenTranscript);

    const intent = await extractQueryIntent(normalized.normalizedQuery);

    // Test applicability against a plastics standard
    const applicability = assessApplicability({
      query: normalized.normalizedQuery,
      intentMaterial: intent.material,
      candidateTitle: "Plastics Bottles/Containers for Packaged Natural Mineral Water and Packaged Drinking Water",
      coverage: {
        product: "covered",
        material: "not_covered",
        application: "covered",
        targetUser: "unknown",
        sector: "unknown",
        testing: "unknown",
        certification: "unknown",
        identifier: "unknown",
        overallCoverageRatio: 0.6,
      },
      groundingState: "verified",
    });

    expect(applicability.state).toBe("MATERIAL_MISMATCH");
    expect(applicability.materialConflict).toBe(true);
    expect(applicability.reason).toContain("steel");
    expect(applicability.reason).toContain("plastic");
  });

  test("noisy transcript never speculatively replaces standard numbers", () => {
    // When a transcript has a general query without standard number, it never injects one
    const generalSpoken = "water purifier testing in Delhi";
    const normalized = normalizeVoiceTranscript(generalSpoken);
    expect(normalized.normalizedQuery).toBe("water purifier testing in Delhi");
    expect(normalized.transformations).not.toContain("spoken_is_acronym_collapse");
  });
});
