/**
 * Shared "raw text → parseable JSON → schema-shaped defaults" helpers for
 * providers whose structured-output path is "ask for JSON in the prompt,
 * then parse" rather than a guaranteed-schema API feature. Used by both
 * GeminiProvider and GroqProvider so a model that returns valid but
 * partial JSON (missing an optional field the schema still requires,
 * using an alternate key name, etc.) doesn't fail `schema.parse` outright
 * — this only fills in defaults/aliases for the two schemas this app
 * actually uses (query intent, LLM answer); it never invents a
 * standard number, evidence, or any other real content.
 */

export function parseJsonFromText(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        const cleaned = candidate.replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(cleaned);
      } catch {}
    }
  }
  throw new Error(`Failed to parse JSON from text: ${trimmed.slice(0, 150)}...`);
}

interface RecommendationExplanationLike {
  standardNumber?: unknown;
  standard_number?: unknown;
  id?: unknown;
  reason?: unknown;
  explanation?: unknown;
  description?: unknown;
}

export function normalizeStructuredObject(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return {};
  const record = obj as Record<string, unknown>;

  // Normalization for Answer
  if (!record.answer && record.summary) record.answer = record.summary;
  if (!record.answer && record.directAnswer) record.answer = record.directAnswer;
  if (!record.answer && record.response) record.answer = record.response;
  if (!record.answer && typeof record.text === "string") record.answer = record.text;

  if (!record.recommendationExplanations) {
    if (Array.isArray(record.standards)) record.recommendationExplanations = record.standards;
    else if (Array.isArray(record.recommendations)) record.recommendationExplanations = record.recommendations;
    else if (Array.isArray(record.candidates)) record.recommendationExplanations = record.candidates;
    else record.recommendationExplanations = [];
  }
  if (Array.isArray(record.recommendationExplanations)) {
    record.recommendationExplanations = (record.recommendationExplanations as RecommendationExplanationLike[]).map((item) => ({
      standardNumber: item.standardNumber ?? item.standard_number ?? item.id ?? null,
      reason: item.reason ?? item.explanation ?? item.description ?? "Relevant standard identified from BIS evidence.",
    }));
  } else {
    record.recommendationExplanations = [];
  }

  if (!record.answer) {
    const explanations = record.recommendationExplanations as { standardNumber: unknown }[];
    record.answer = explanations.length > 0
      ? `Based on BIS evidence, ${explanations.map((r) => r.standardNumber).filter(Boolean).join(", ")} applies to your query.`
      : "Information retrieved from the indexed BIS evidence.";
  }

  if (!record.nextSteps && record.next_steps) record.nextSteps = record.next_steps;
  if (!Array.isArray(record.nextSteps)) record.nextSteps = [];

  if (!record.limitations && record.uncertainty) record.limitations = record.uncertainty;
  if (!Array.isArray(record.limitations)) record.limitations = [];

  if (!record.certificationNotes && record.certification_notes) record.certificationNotes = record.certification_notes;
  if (record.certificationNotes === undefined) record.certificationNotes = null;

  if (!record.testingNotes && record.testing_notes) record.testingNotes = record.testing_notes;
  if (record.testingNotes === undefined) record.testingNotes = null;

  // Normalization for Intent
  const validIntents = new Set(["find_applicable_standard", "certification_process", "testing_requirements", "general_information", "unclear"]);
  if (record.intent && !validIntents.has(record.intent as string)) {
    const rawIntent = String(record.intent).toLowerCase().replace(/[^a-z_]/g, "_");
    if (rawIntent.includes("certif")) record.intent = "certification_process";
    else if (rawIntent.includes("test")) record.intent = "testing_requirements";
    else if (rawIntent.includes("standard") || rawIntent.includes("find")) record.intent = "find_applicable_standard";
    else record.intent = "general_information";
  }
  if (!record.intent) record.intent = "find_applicable_standard";

  if (record.isRelevant === undefined) record.isRelevant = true;
  if (record.relevanceMessage === undefined) record.relevanceMessage = null;
  if (record.product === undefined) record.product = null;
  if (record.material === undefined) record.material = null;
  if (record.useCase === undefined) record.useCase = null;
  if (record.targetUser === undefined) record.targetUser = null;
  if (record.sector === undefined) record.sector = null;
  if (record.certificationRequested === undefined) record.certificationRequested = false;
  if (record.testingRequested === undefined) record.testingRequested = false;
  if (record.searchQuery === undefined) record.searchQuery = "";
  if (!Array.isArray(record.missingInformation)) record.missingInformation = [];

  return record;
}
