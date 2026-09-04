/**
 * STT Provider abstractions and types for BIS Standards Navigator.
 * Integrates multilingual STT (BharatSTT) with the existing deterministic pipeline.
 */

export type STTProviderType = "bharatstt" | "mock" | "none";

export type STTState =
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "LISTENING"
  | "STOPPING"
  | "UPLOADING"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "ERROR"
  | "UNAVAILABLE";

export interface AudioInput {
  buffer: Buffer;
  mimeType: string;
  durationMs?: number;
  fileName?: string;
}

export interface STTOptions {
  language?: string; // e.g. "auto", "hi", "en", "ta", "te", "bn", "mr", "gu"
  timeoutMs?: number;
}

export interface STTResult {
  text: string;
  language?: string;
  confidence?: number | null; // null if provider does not compute confidence (never fabricated)
  durationMs?: number;
  provider: STTProviderType;
  metadata?: Record<string, unknown>;
}

export interface STTProvider {
  readonly name: STTProviderType;
  transcribe(audio: AudioInput, options?: STTOptions): Promise<STTResult>;
  isAvailable(): Promise<boolean>;
}

export interface NormalizedVoiceQuery {
  originalTranscript: string;
  normalizedQuery: string;
  detectedLanguage?: string;
  transformations: string[];
}
