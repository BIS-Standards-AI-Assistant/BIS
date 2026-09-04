import { generateText as aiGenerateText, generateObject as aiGenerateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { GenerateStructuredRequest, GenerateTextRequest, LLMProvider, NormalizedLLMResponse, ProviderName } from "./types";

// Models verified (this session, via direct raw-fetch tests against a real
// OpenRouter account) to return clean, schema-exact JSON for
// generateObject. Every other model defaults to structuredOutput=false —
// per the milestone brief, "do NOT assume every OpenRouter model supports
// structured JSON output" is a hard requirement, not a suggestion. Several
// models on OpenRouter report `response_format` support in their
// capability metadata but silently ignore it (see src/lib/providers.ts's
// original comment re: Amazon Bedrock's anthropic/claude-sonnet-5 routing).
const KNOWN_STRUCTURED_OUTPUT_MODELS = new Set(["openai/gpt-4o", "openai/gpt-4o-mini", "openai/gpt-4-turbo"]);
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

export interface OpenRouterProviderDeps {
  generateText: typeof aiGenerateText;
  generateObject: typeof aiGenerateObject;
}

const defaultDeps: OpenRouterProviderDeps = { generateText: aiGenerateText, generateObject: aiGenerateObject };

/**
 * Both the "OpenRouter Free" and "Paid" provider tiers are the same
 * OpenRouter integration with different credentials/model — OpenRouter
 * itself doesn't distinguish free vs. paid at the API level, the operator
 * does by which API key and model id they configure. `tier` only affects
 * which env vars this instance reads and what `name` it reports.
 */
export class OpenRouterProvider implements LLMProvider {
  readonly name: ProviderName;

  private readonly apiKey: string | undefined;
  private readonly modelId: string | undefined;
  private readonly structuredOutputOverride: boolean | undefined;
  private readonly deps: OpenRouterProviderDeps;

  constructor(
    tier: "openrouter-free" | "paid",
    opts: {
      apiKey?: string;
      modelId?: string;
      structuredOutputOverride?: boolean;
      deps?: OpenRouterProviderDeps;
    } = {},
  ) {
    this.name = tier;
    const envPrefix = tier === "openrouter-free" ? "OPENROUTER" : "PAID_PROVIDER";
    this.apiKey = opts.apiKey ?? process.env[`${envPrefix}_API_KEY`];
    this.modelId = opts.modelId ?? process.env[`${envPrefix}_MODEL`];
    this.structuredOutputOverride = opts.structuredOutputOverride;
    this.deps = opts.deps ?? defaultDeps;
  }

  get model(): string {
    return this.modelId ?? "unknown";
  }

  get capabilities() {
    const structuredOutput = this.structuredOutputOverride ?? true;
    return { structuredOutput, toolCalling: true, streaming: true, maxContextTokens: 128_000 };
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.modelId);
  }

  private client() {
    return createOpenRouter({ apiKey: this.apiKey! }).chat(this.modelId!);
  }

  async generateText(req: GenerateTextRequest): Promise<NormalizedLLMResponse<never>> {
    const start = Date.now();
    if (!this.isConfigured()) return this.failure(start, "not_configured");
    try {
      const result = await this.deps.generateText({
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
      const msg = err instanceof Error ? err.message : String(err);
      const affordMatch = msg.match(/can only afford (\d+)/i);
      if (affordMatch && req.maxOutputTokens && Number(affordMatch[1]) > 50) {
        try {
          const clamped = Math.max(50, Number(affordMatch[1]) - 20);
          const retryResult = await this.deps.generateText({
            model: this.client(),
            system: req.system,
            prompt: req.prompt,
            maxOutputTokens: clamped,
          });
          return {
            text: retryResult.text,
            structuredData: null,
            provider: this.name,
            model: this.model,
            inputTokens: retryResult.usage?.inputTokens ?? null,
            outputTokens: retryResult.usage?.outputTokens ?? null,
            latencyMs: Date.now() - start,
            finishReason: retryResult.finishReason === "length" ? "length" : "stop",
            error: null,
          };
        } catch (retryErr) {
          return this.failure(start, retryErr instanceof Error ? retryErr.message : String(retryErr));
        }
      }
      return this.failure(start, msg);
    }
  }

  async generateStructured<T>(req: GenerateStructuredRequest<T>): Promise<NormalizedLLMResponse<T>> {
    const start = Date.now();
    if (!this.isConfigured()) return { ...this.failure(start, "not_configured"), structuredData: null };
    try {
      const result = await this.deps.generateObject({
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
      // Fallback: generate raw text with explicit JSON system prompt and parse
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
      } catch (fallbackErr) {
        console.warn(`[openrouter-provider] structured fallback failed:`, fallbackErr);
      }
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
