import type { ZodType } from "zod";

/**
 * Provider-independent LLM abstraction. The rest of the intelligence engine
 * (intent.ts, answer.ts, API routes) talks only to these types — never to
 * a provider SDK's own request/response shapes. See docs/ARCHITECTURE.md.
 */

export type ProviderName = "gemini" | "local" | "openrouter-free" | "paid";

export interface ProviderCapabilities {
  /** Can this provider reliably return schema-conformant structured JSON? Never assumed true by default. */
  structuredOutput: boolean;
  toolCalling: boolean;
  streaming: boolean;
  maxContextTokens: number;
}

export type FinishReason = "stop" | "length" | "error" | "unknown";

/**
 * Every provider call returns this shape, win or lose. `error` is set (and
 * `text`/`structuredData` are null) on failure — callers check `error`
 * rather than relying on exceptions, so a failed provider call is a normal
 * data flow, not an exceptional one (this is what makes fallback simple
 * and testable).
 */
export interface NormalizedLLMResponse<T = unknown> {
  text: string | null;
  structuredData: T | null;
  provider: ProviderName;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  finishReason: FinishReason;
  error: string | null;
}

export interface GenerateTextRequest {
  system?: string;
  prompt: string;
  maxOutputTokens: number;
}

export interface GenerateStructuredRequest<T> extends GenerateTextRequest {
  schema: ZodType<T>;
}

export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  readonly capabilities: ProviderCapabilities;
  /** Cheap, local config check (env vars present) — NOT a network call. Used to decide whether to even try this provider. */
  isConfigured(): boolean;
  generateText(req: GenerateTextRequest): Promise<NormalizedLLMResponse<never>>;
  generateStructured<T>(req: GenerateStructuredRequest<T>): Promise<NormalizedLLMResponse<T>>;
}
