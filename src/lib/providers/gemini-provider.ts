import { generateText as aiGenerateText, generateObject as aiGenerateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { GenerateStructuredRequest, GenerateTextRequest, LLMProvider, NormalizedLLMResponse } from "./types";

function parseJsonFromText(raw: string): unknown {
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

function normalizeStructuredObject(obj: unknown): Record<string, unknown> {
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

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;

  private readonly apiKey: string | undefined;
  private readonly modelId: string;

  constructor(opts: { apiKey?: string; modelId?: string } = {}) {
    this.apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.modelId = opts.modelId ?? process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  }

  get model(): string {
    return this.modelId;
  }

  get capabilities() {
    return {
      structuredOutput: true,
      toolCalling: true,
      streaming: true,
      maxContextTokens: 1_000_000,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private client() {
    return createGoogleGenerativeAI({ apiKey: this.apiKey! })(this.modelId);
  }

  async generateText(req: GenerateTextRequest): Promise<NormalizedLLMResponse<never>> {
    const start = Date.now();
    if (!this.isConfigured()) return this.failure(start, "not_configured: GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY not set");
    try {
      const result = await aiGenerateText({
        model: this.client(),
        system: req.system,
        prompt: req.prompt,
        maxOutputTokens: req.maxOutputTokens,
      });
      return {
        text: result.text,
        structuredData: null,
        provider: this.name,
        model: this.model,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        latencyMs: Date.now() - start,
        finishReason: result.finishReason === "length" ? "length" : "stop",
        error: null,
      };
    } catch (err) {
      return this.failure(start, err instanceof Error ? err.message : String(err));
    }
  }

  async generateStructured<T>(req: GenerateStructuredRequest<T>): Promise<NormalizedLLMResponse<T>> {
    const start = Date.now();
    if (!this.isConfigured()) return { ...this.failure(start, "not_configured: GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY not set"), structuredData: null };
    
    // First, try fast text generation with explicit JSON format instruction (reliable across all Gemini models)
    try {
      const textResult = await this.generateText({
        system: (req.system ? req.system + "\n\n" : "") + "CRITICAL INSTRUCTION: You MUST output ONLY a valid JSON object matching the requested schema. Do NOT include markdown code blocks, backticks, reasoning, or conversational text.",
        prompt: req.prompt + "\n\nProvide the complete response as a single, valid JSON object strictly complying with the required structure.",
        maxOutputTokens: req.maxOutputTokens || 2000,
      });
      if (textResult.text) {
        const parsed = parseJsonFromText(textResult.text);
        const normalized = normalizeStructuredObject(parsed);
        const validated = req.schema.parse(normalized);
        return {
          text: null,
          structuredData: validated,
          provider: this.name,
          model: this.model,
          inputTokens: textResult.inputTokens,
          outputTokens: textResult.outputTokens,
          latencyMs: Date.now() - start,
          finishReason: textResult.finishReason,
          error: null,
        };
      }
    } catch (err) {
      console.warn("[gemini-provider] text JSON generation failed, trying aiGenerateObject:", err);
    }

    try {
      const result = await aiGenerateObject({
        model: this.client(),
        schema: req.schema,
        system: req.system,
        prompt: req.prompt,
        maxOutputTokens: req.maxOutputTokens,
      });
      return {
        text: null,
        structuredData: result.object,
        provider: this.name,
        model: this.model,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        latencyMs: Date.now() - start,
        finishReason: result.finishReason === "length" ? "length" : "stop",
        error: null,
      };
    } catch (err) {
      return { ...this.failure(start, err instanceof Error ? err.message : String(err)), structuredData: null };
    }
  }

  private failure(start: number, error: string): NormalizedLLMResponse<never> {
    return {
      text: null,
      structuredData: null,
      provider: this.name,
      model: this.model,
      inputTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - start,
      finishReason: "error",
      error,
    };
  }
}
