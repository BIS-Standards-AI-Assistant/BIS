import type { NormalizedTranscription, SttProvider, TranscriptionRequest } from "./types";

/**
 * Transcription via any OpenAI-compatible `/audio/transcriptions` endpoint.
 * One implementation covers every realistic option because they all speak
 * the same multipart contract:
 *
 * - Groq        (STT_BASE_URL=https://api.groq.com/openai/v1, whisper-large-v3-turbo)
 * - OpenAI      (STT_BASE_URL=https://api.openai.com/v1, whisper-1)
 * - self-hosted (faster-whisper-server, whisper.cpp server, etc.)
 *
 * Same reasoning as src/lib/providers/local-provider.ts: a plain `fetch`
 * against a documented HTTP contract, so no vendor SDK becomes a build
 * dependency and swapping providers is env-only.
 */
export class OpenAICompatibleSttProvider implements SttProvider {
  readonly name = "openai-compatible-stt";

  constructor(
    private readonly baseUrl: string | undefined = process.env.STT_BASE_URL,
    private readonly apiKey: string | undefined = process.env.STT_API_KEY,
    private readonly modelId: string | undefined = process.env.STT_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = 30_000,
  ) {}

  get model(): string {
    return this.modelId ?? "unknown";
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey && this.modelId);
  }

  async transcribe(req: TranscriptionRequest): Promise<NormalizedTranscription> {
    const start = Date.now();
    if (!this.isConfigured()) {
      return this.failure(start, "not_configured: STT_BASE_URL/STT_API_KEY/STT_MODEL not set");
    }

    try {
      const form = new FormData();
      // The extension matters: these APIs sniff the container format from
      // the filename, and MediaRecorder's default in Chromium is webm/opus.
      const extension = req.mimeType.includes("mp4") ? "mp4" : req.mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("file", new Blob([req.audio], { type: req.mimeType }), `audio.${extension}`);
      form.append("model", this.modelId!);
      // Whisper autodetects language, but an explicit hint measurably
      // reduces cross-language confusion between Indian languages.
      if (req.language) form.append("language", req.language);
      form.append("response_format", "json");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await this.fetchImpl(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return this.failure(start, `HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
      }

      const body = (await res.json()) as { text?: string };
      const text = body.text?.trim();
      return {
        text: text || null,
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - start,
        error: text ? null : "empty_transcript",
      };
    } catch (err) {
      return this.failure(start, err instanceof Error ? err.message : String(err));
    }
  }

  private failure(start: number, error: string): NormalizedTranscription {
    return { text: null, provider: this.name, model: this.model, latencyMs: Date.now() - start, error };
  }
}
