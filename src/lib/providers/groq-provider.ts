import { generateText as aiGenerateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { GenerateStructuredRequest, GenerateTextRequest, LLMProvider, NormalizedLLMResponse } from "./types";
import { parseJsonFromText, normalizeStructuredObject } from "./normalize-structured";

// Verified live (2026-09-04, direct raw-fetch against Groq's real API,
// response_format: json_object) to return clean, schema-parseable JSON in
// its `content` field with reasoning kept separate — never assumed for a
// model not actually checked, per the same rule OpenRouterProvider follows.
const KNOWN_STRUCTURED_OUTPUT_MODELS = new Set(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);

/**
 * Groq — an OpenAI-compatible chat completions API (https://api.groq.com/openai/v1).
 * Fast (sub-second on the verified model) and used as the primary tier
 * ahead of Gemini in the routing order. structuredOutput is gated by
 * KNOWN_STRUCTURED_OUTPUT_MODELS, not assumed true by default — the same
 * rule the OpenRouter provider follows — and generateStructured still
 * goes through "ask for raw JSON in the prompt, then parse" rather than
 * the API's own response_format parameter, since that's what was actually
 * verified live.
 */
export class GroqProvider implements LLMProvider {
  readonly name = "groq" as const;

  private readonly apiKey: string | undefined;
  private readonly modelId: string;

  constructor(opts: { apiKey?: string; modelId?: string } = {}) {
    this.apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
    this.modelId = opts.modelId ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
  }

  get model(): string {
    return this.modelId;
  }

  get capabilities() {
    return {
      structuredOutput: KNOWN_STRUCTURED_OUTPUT_MODELS.has(this.modelId),
      toolCalling: true,
      streaming: true,
      maxContextTokens: 128_000,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private client() {
    return createOpenAICompatible({
      name: "groq",
      apiKey: this.apiKey!,
      baseURL: "https://api.groq.com/openai/v1",
    }).chatModel(this.modelId);
  }

  async generateText(req: GenerateTextRequest): Promise<NormalizedLLMResponse<never>> {
    const start = Date.now();
    if (!this.isConfigured()) return this.failure(start, "not_configured: GROQ_API_KEY not set");
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
    if (!this.isConfigured()) return { ...this.failure(start, "not_configured: GROQ_API_KEY not set"), structuredData: null };
    try {
      const textResult = await this.generateText({
        system: (req.system ? req.system + "\n\n" : "") + "CRITICAL: You MUST respond with ONLY a valid, parseable raw JSON object matching the requested schema. Do not enclose in markdown blocks or include commentary.",
        prompt: req.prompt,
        maxOutputTokens: req.maxOutputTokens,
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
      return { ...this.failure(start, "empty response"), structuredData: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ...this.failure(start, msg), structuredData: null };
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
