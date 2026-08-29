import type { GenerateStructuredRequest, GenerateTextRequest, LLMProvider, NormalizedLLMResponse } from "./types";

/**
 * Local inference via any OpenAI-compatible `/chat/completions` endpoint
 * (Ollama, LM Studio, vLLM's OpenAI-compat server, etc.). No SDK dependency
 * — a local server is a plain HTTP call, and keeping this to `fetch` means
 * no local inference server is a hard dependency of the build.
 *
 * Structured output is NOT assumed. Most local models don't reliably honor
 * JSON-schema-constrained decoding, so `capabilities.structuredOutput` is
 * false unless the operator explicitly opts in via
 * LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT=true (they'd only do that for a
 * model/server combination they've verified themselves).
 */
export class LocalProvider implements LLMProvider {
  readonly name = "local" as const;

  constructor(
    private readonly baseUrl: string | undefined = process.env.LOCAL_LLM_BASE_URL,
    private readonly modelId: string | undefined = process.env.LOCAL_LLM_MODEL,
    private readonly structuredOutputOptIn: boolean = process.env.LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT === "true",
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = 15_000,
  ) {}

  get model(): string {
    return this.modelId ?? "unknown";
  }

  get capabilities() {
    return {
      structuredOutput: this.structuredOutputOptIn,
      toolCalling: false,
      streaming: false,
      maxContextTokens: 8192,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.modelId);
  }

  async generateText(req: GenerateTextRequest): Promise<NormalizedLLMResponse<never>> {
    const start = Date.now();
    if (!this.isConfigured()) {
      return this.failure(start, "not_configured: LOCAL_LLM_BASE_URL/LOCAL_LLM_MODEL not set");
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            ...(req.system ? [{ role: "system", content: req.system }] : []),
            { role: "user", content: req.prompt },
          ],
          max_tokens: req.maxOutputTokens,
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return this.failure(start, `HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
      }

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = body.choices?.[0];
      return {
        text: choice?.message?.content ?? null,
        structuredData: null,
        provider: this.name,
        model: this.model,
        inputTokens: body.usage?.prompt_tokens ?? null,
        outputTokens: body.usage?.completion_tokens ?? null,
        latencyMs: Date.now() - start,
        finishReason: choice?.finish_reason === "length" ? "length" : "stop",
        error: null,
      };
    } catch (err) {
      return this.failure(start, err instanceof Error ? err.message : String(err));
    }
  }

  async generateStructured<T>(req: GenerateStructuredRequest<T>): Promise<NormalizedLLMResponse<T>> {
    if (!this.capabilities.structuredOutput) {
      return { ...this.failure(Date.now(), "capability_unsupported: local provider is not configured for structured output"), structuredData: null };
    }
    // Even when opted in, still go through generateText and attempt to
    // JSON.parse + schema-validate — an OpenAI-compatible completions
    // endpoint has no native "structured output" concept, only
    // instructions to emit JSON, so parsing can still fail.
    const textResult = await this.generateText(req);
    if (textResult.error || !textResult.text) {
      return { ...textResult, structuredData: null };
    }
    try {
      const parsed = req.schema.parse(JSON.parse(textResult.text));
      return { ...textResult, structuredData: parsed };
    } catch (err) {
      return {
        ...textResult,
        structuredData: null,
        error: `schema_validation_failed: ${err instanceof Error ? err.message : String(err)}`,
      };
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
