import { generateText as aiGenerateText, generateObject as aiGenerateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { GenerateStructuredRequest, GenerateTextRequest, LLMProvider, NormalizedLLMResponse } from "./types";
import { parseJsonFromText, normalizeStructuredObject } from "./normalize-structured";

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
