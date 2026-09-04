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

function normalizeStructuredObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  
  // Normalization for Answer
  if (!obj.answer && obj.summary) obj.answer = obj.summary;
  if (!obj.answer && obj.directAnswer) obj.answer = obj.directAnswer;
  if (!obj.answer && obj.response) obj.answer = obj.response;
  if (!obj.answer && typeof obj.text === "string") obj.answer = obj.text;

  if (!obj.recommendationExplanations) {
    if (Array.isArray(obj.standards)) obj.recommendationExplanations = obj.standards;
    else if (Array.isArray(obj.recommendations)) obj.recommendationExplanations = obj.recommendations;
    else if (Array.isArray(obj.candidates)) obj.recommendationExplanations = obj.candidates;
    else obj.recommendationExplanations = [];
  }
  if (Array.isArray(obj.recommendationExplanations)) {
    obj.recommendationExplanations = obj.recommendationExplanations.map((item: any) => ({
      standardNumber: item.standardNumber ?? item.standard_number ?? item.id ?? null,
      reason: item.reason ?? item.explanation ?? item.description ?? "Relevant standard identified from BIS evidence.",
    }));
  } else {
    obj.recommendationExplanations = [];
  }

  if (!obj.answer) {
    obj.answer = obj.recommendationExplanations.length > 0
      ? `Based on BIS evidence, ${obj.recommendationExplanations.map((r: any) => r.standardNumber).filter(Boolean).join(", ")} applies to your query.`
      : "Information retrieved from the indexed BIS evidence.";
  }

  if (!obj.nextSteps && obj.next_steps) obj.nextSteps = obj.next_steps;
  if (!Array.isArray(obj.nextSteps)) obj.nextSteps = [];

  if (!obj.limitations && obj.uncertainty) obj.limitations = obj.uncertainty;
  if (!Array.isArray(obj.limitations)) obj.limitations = [];

  if (!obj.certificationNotes && obj.certification_notes) obj.certificationNotes = obj.certification_notes;
  if (obj.certificationNotes === undefined) obj.certificationNotes = null;

  if (!obj.testingNotes && obj.testing_notes) obj.testingNotes = obj.testing_notes;
  if (obj.testingNotes === undefined) obj.testingNotes = null;

  // Normalization for Intent
  const validIntents = new Set(["find_applicable_standard", "certification_process", "testing_requirements", "general_information", "unclear"]);
  if (obj.intent && !validIntents.has(obj.intent)) {
    const rawIntent = String(obj.intent).toLowerCase().replace(/[^a-z_]/g, "_");
    if (rawIntent.includes("certif")) obj.intent = "certification_process";
    else if (rawIntent.includes("test")) obj.intent = "testing_requirements";
    else if (rawIntent.includes("standard") || rawIntent.includes("find")) obj.intent = "find_applicable_standard";
    else obj.intent = "general_information";
  }
  if (!obj.intent) obj.intent = "find_applicable_standard";

  if (obj.isRelevant === undefined) obj.isRelevant = true;
  if (obj.relevanceMessage === undefined) obj.relevanceMessage = null;
  if (obj.product === undefined) obj.product = null;
  if (obj.material === undefined) obj.material = null;
  if (obj.useCase === undefined) obj.useCase = null;
  if (obj.targetUser === undefined) obj.targetUser = null;
  if (obj.sector === undefined) obj.sector = null;
  if (obj.certificationRequested === undefined) obj.certificationRequested = false;
  if (obj.testingRequested === undefined) obj.testingRequested = false;
  if (obj.searchQuery === undefined) obj.searchQuery = "";
  if (!Array.isArray(obj.missingInformation)) obj.missingInformation = [];

  return obj;
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
