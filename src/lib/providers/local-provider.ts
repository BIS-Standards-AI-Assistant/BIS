import type { GenerateStructuredRequest, GenerateTextRequest, LLMProvider, NormalizedLLMResponse } from "./types";

/**
 * Local inference via any OpenAI-compatible `/chat/completions` endpoint
 * (Ollama, LM Studio, vLLM's OpenAI-compat server, etc.). No SDK dependency
 * — a local server is a plain HTTP call, and keeping this to `fetch` means
 * no local inference server is a hard dependency of the build.
 *
 * For Ollama specifically, `LOCAL_LLM_BASE_URL` is the OpenAI-compat root
 * — `http://localhost:11434/v1` on the host, `http://ollama:11434/v1`
 * inside the Docker `local` profile (see docker-compose.yml). This class
 * appends `/chat/completions` to it. Verify a real round trip with
 * `npm run ollama:smoke` before relying on this path — see
 * docs/ARCHITECTURE.md.
 *
 * `LOCAL_LLM_API_KEY`, when set, is sent as `Authorization: Bearer <key>`.
 * Ollama itself has no auth, so this only matters when `LOCAL_LLM_BASE_URL`
 * points at a remote host (e.g. a separate VM running Ollama behind a
 * reverse proxy that checks this bearer token) — see deploy/ollama-vm/.
 * Unset for a same-machine/same-Docker-network Ollama, where the network
 * boundary itself is the protection.
 *
 * Structured output is NOT assumed. Most local models don't reliably honor
 * JSON-schema-constrained decoding, so `capabilities.structuredOutput` is
 * false unless the operator explicitly opts in via
 * LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT=true (they'd only do that for a
 * model/server combination they've verified themselves). When not opted
 * in, the router simply skips this provider for structured calls and the
 * existing deterministic / evidence-only path handles them.
 *
 * Errors are normalized to a small set of prefixes so the caller (and the
 * `npm run ollama:smoke` script) can tell the failure modes apart:
 *   not_configured:     LOCAL_LLM_BASE_URL / LOCAL_LLM_MODEL unset
 *   connection_failed:  server unreachable (refused / DNS / reset)
 *   timeout:            no response within LOCAL_LLM_TIMEOUT_MS
 *   model_not_found:    server reachable, configured model not pulled
 *   http_error:         any other non-2xx response
 *   invalid_response:   2xx but no usable completion in the body
 *   schema_validation_failed / <parse error>: structured output only
 */
const DEFAULT_TIMEOUT_MS = 15_000;

/** A finite, positive number of ms, or the 15s default for anything else (unset env, NaN, 0, negative). */
function resolveTimeoutMs(raw: string | number | undefined): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export class LocalProvider implements LLMProvider {
  readonly name = "local" as const;

  private readonly timeoutMs: number;

  constructor(
    private readonly baseUrl: string | undefined = process.env.LOCAL_LLM_BASE_URL,
    private readonly modelId: string | undefined = process.env.LOCAL_LLM_MODEL,
    private readonly structuredOutputOptIn: boolean = process.env.LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT === "true",
    private readonly fetchImpl: typeof fetch = fetch,
    timeoutMs: number | undefined = undefined,
    private readonly apiKey: string | undefined = process.env.LOCAL_LLM_API_KEY,
  ) {
    // Local CPU inference is slower and more variable than a hosted API, so
    // the timeout is operator-tunable via LOCAL_LLM_TIMEOUT_MS (or the
    // constructor arg, for tests). The default is unchanged (15s) — this is
    // a knob, not a silent increase.
    this.timeoutMs = resolveTimeoutMs(timeoutMs ?? process.env.LOCAL_LLM_TIMEOUT_MS);
  }

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            ...(req.system ? [{ role: "system", content: req.system }] : []),
            { role: "user", content: req.prompt },
          ],
          max_tokens: req.maxOutputTokens,
          stream: false,
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (controller.signal.aborted || /abort/i.test(message)) {
        return this.failure(start, `timeout: no response within ${this.timeoutMs}ms`);
      }
      return this.failure(start, `connection_failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => res.statusText);
      // Ollama's OpenAI-compat endpoint returns 404 with a body like
      // {"error":{"message":"model \"x\" not found, try pulling it first"}}
      // when the configured model has not been pulled — a distinct,
      // actionable failure from the server simply being down.
      if (res.status === 404 && /not found|not exist|pull/i.test(bodyText)) {
        return this.failure(start, `model_not_found: ${this.model} — pull it first (\`ollama pull ${this.model}\`)`);
      }
      return this.failure(start, `http_error: HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
    }

    let body: {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    try {
      body = await res.json();
    } catch (err) {
      return this.failure(start, `invalid_response: response body was not valid JSON (${err instanceof Error ? err.message : String(err)})`);
    }

    const choice = body.choices?.[0];
    const content = choice?.message?.content;
    if (!content || !content.trim()) {
      return this.failure(start, "invalid_response: model returned an empty completion");
    }

    return {
      text: content,
      structuredData: null,
      provider: this.name,
      model: this.model,
      inputTokens: body.usage?.prompt_tokens ?? null,
      outputTokens: body.usage?.completion_tokens ?? null,
      latencyMs: Date.now() - start,
      finishReason: choice?.finish_reason === "length" ? "length" : "stop",
      error: null,
    };
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
