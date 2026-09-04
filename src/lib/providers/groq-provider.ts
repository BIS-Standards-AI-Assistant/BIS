import { generateText as aiGenerateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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
    try {
      return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
    } catch {}
  }
  throw new Error(`Failed to parse JSON from text: ${trimmed.slice(0, 100)}...`);
}

/**
 * Groq — an OpenAI-compatible chat completions API (https://api.groq.com/openai/v1),
 * used here strictly as an additional fallback tier behind Gemini. Groq's
 * hosted open-weight models are not verified to reliably honor
 * response_format=json_object across the board, so structuredOutput
 * defaults to false and generateStructured always goes through the same
 * "ask for raw JSON in the prompt, then parse" path generateText uses —
 * never assumed, per the same rule the OpenRouter provider follows.
 */
export class GroqProvider implements LLMProvider {
  readonly name = "groq" as const;

  private readonly apiKey: string | undefined;
  private readonly modelId: string;

  constructor(opts: { apiKey?: string; modelId?: string } = {}) {
    this.apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
    this.modelId = opts.modelId ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  }

  get model(): string {
    return this.modelId;
  }

  get capabilities() {
    return { structuredOutput: false, toolCalling: true, streaming: true, maxContextTokens: 128_000 };
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
        const validated = req.schema.parse(parsed);
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
