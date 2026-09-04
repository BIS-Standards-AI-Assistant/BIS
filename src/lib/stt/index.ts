import { OpenAICompatibleSttProvider } from "./openai-compatible-provider";
import type { SttProvider } from "./types";

export type { SttProvider, TranscriptionRequest, NormalizedTranscription } from "./types";
export { OpenAICompatibleSttProvider } from "./openai-compatible-provider";

/**
 * Built fresh per request (constructing it is cheap, no persistent
 * connections) so tests and deployments can change env between calls
 * without stale state — same reasoning as getProviderChain() in
 * src/lib/providers/index.ts.
 *
 * Server-side transcription is OPTIONAL. When it isn't configured, voice
 * input still works in browsers with a functioning Web Speech API; only
 * browsers that lack it (Brave, Arc, plain Chromium, Firefox) lose the
 * feature, and they're told so honestly rather than shown a dead button.
 */
export function getSttProvider(): SttProvider {
  return new OpenAICompatibleSttProvider();
}
