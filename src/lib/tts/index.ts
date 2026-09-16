import { GoogleTtsProvider } from "./google-provider";
import type { TtsProvider } from "./types";

export type { TtsProvider, SynthesisRequest, NormalizedSynthesis } from "./types";
export { GoogleTtsProvider, voiceFor } from "./google-provider";

/**
 * Built fresh per request (construction is trivial, no persistent
 * connections) so env changes take effect without stale state — same
 * reasoning as getProviderChain() and getSttProvider().
 *
 * Read-aloud is OPTIONAL. With no key configured the endpoint reports that
 * plainly and the UI falls back to the browser's own speechSynthesis, which
 * needs no server at all.
 */
export function getTtsProvider(): TtsProvider {
  return new GoogleTtsProvider();
}
