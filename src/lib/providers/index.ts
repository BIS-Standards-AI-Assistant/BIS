import { GeminiProvider } from "./gemini-provider";
import { LocalProvider } from "./local-provider";
import { OpenRouterProvider } from "./openrouter-provider";
import { resolveProviderChain } from "./router";
import type { LLMProvider } from "./types";

export type { LLMProvider, NormalizedLLMResponse, ProviderCapabilities, ProviderName, GenerateTextRequest, GenerateStructuredRequest } from "./types";
export { generateTextWithFallback, generateStructuredWithFallback, resolveProviderChain, resetProviderCooldowns } from "./router";
export type { FallbackResult, FallbackTraceEntry } from "./router";
export { GeminiProvider } from "./gemini-provider";
export { LocalProvider } from "./local-provider";
export { OpenRouterProvider } from "./openrouter-provider";

/**
 * Builds the full provider chain from environment configuration. Called
 * fresh per request (constructing these objects is cheap — no persistent
 * connections) rather than as a module-level singleton, so tests can swap
 * `process.env` between cases without stale state.
 *
 * Paid LLM inference is optional and is NOT a dependency of the BIS
 * intelligence engine: with no environment configured at all, every
 * provider's `isConfigured()` returns false, the chain resolves as
 * effectively empty at call time, and intent.ts/answer.ts fall back to
 * deterministic behavior (see docs/ARCHITECTURE.md).
 */
export function getProviderChain(): LLMProvider[] {
  const providers: LLMProvider[] = [
    new GeminiProvider(),
    new LocalProvider(),
    new OpenRouterProvider("openrouter-free"),
    new OpenRouterProvider("paid"),
  ];
  return resolveProviderChain(providers);
}
