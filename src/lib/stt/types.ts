/**
 * Provider-independent speech-to-text abstraction.
 *
 * Deliberately a SEPARATE interface from LLMProvider (src/lib/providers/
 * types.ts) rather than a fourth method on it: the I/O shapes don't overlap
 * (audio bytes in, transcript out — no prompt, no system message, no
 * schema, no token counts), and every existing LLM provider would have to
 * stub a capability it doesn't have. It follows the same *contract* though:
 * a failed call returns a normalized value with `error` set instead of
 * throwing, so fallback stays ordinary data flow.
 */

export interface TranscriptionRequest {
  audio: ArrayBuffer;
  /** MIME type of the recording, e.g. "audio/webm" — sent as the upload filename's extension hint. */
  mimeType: string;
  /** BCP-47-ish language hint (e.g. "hi", "ta"). Improves accuracy materially for Indian languages. */
  language?: string;
}

export interface NormalizedTranscription {
  text: string | null;
  provider: string;
  model: string;
  latencyMs: number;
  error: string | null;
}

export interface SttProvider {
  readonly name: string;
  readonly model: string;
  /** Cheap, local config check (env vars present) — NOT a network call. */
  isConfigured(): boolean;
  transcribe(req: TranscriptionRequest): Promise<NormalizedTranscription>;
}

/**
 * Result of cleaning up a raw transcript before it reaches retrieval — see
 * voice-normalizer.ts. Carried over from the previous STT implementation's
 * stt-types.ts along with the normalizer itself, which handles the
 * domain-specific problem generic transcription cannot: a spoken standard
 * number arrives as "I S 4151" or "आई एस ४१५१" and has to become "IS 4151"
 * before the identifier resolver can match it.
 */
export interface NormalizedVoiceQuery {
  originalTranscript: string;
  normalizedQuery: string;
  detectedLanguage?: string;
  transformations: string[];
}
