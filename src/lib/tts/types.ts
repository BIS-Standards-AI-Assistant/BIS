/**
 * Provider-independent text-to-speech abstraction.
 *
 * Same shape and contract as the STT layer in src/lib/stt/: a failed call
 * returns a normalized value with `error` set rather than throwing, so
 * degradation stays ordinary data flow.
 *
 * Synthesis is deliberately server-side. Running a model in the browser was
 * tried and rejected on measurement: it costs every visitor a large
 * one-time download, and the only in-browser option available (kokoro-js)
 * ships English voices only, which is disqualifying for a service whose
 * answers are produced in English *and* Hindi.
 */

export interface SynthesisRequest {
  text: string;
  /** Answer language code — "en" | "hi" (see src/lib/language.ts). */
  language: string;
}

export interface NormalizedSynthesis {
  /** Raw audio bytes, or null on failure. */
  audio: ArrayBuffer | null;
  /** MIME type of `audio`, e.g. "audio/mpeg". */
  mimeType: string;
  provider: string;
  voice: string;
  latencyMs: number;
  error: string | null;
}

export interface TtsProvider {
  readonly name: string;
  /** Cheap, local config check (env vars present) — NOT a network call. */
  isConfigured(): boolean;
  synthesize(req: SynthesisRequest): Promise<NormalizedSynthesis>;
}
