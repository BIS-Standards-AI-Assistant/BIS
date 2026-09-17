import type { NormalizedSynthesis, SynthesisRequest, TtsProvider } from "./types";

/**
 * Google Cloud Text-to-Speech via its REST endpoint.
 *
 * Called with plain `fetch` rather than @google-cloud/text-to-speech on
 * purpose: the SDK drags in gRPC and a large native dependency tree, and
 * this project has already been bitten once by a transitive native module
 * (sharp) failing to build. One HTTP POST has no such failure mode and
 * keeps the Docker image small.
 *
 * Standard voices are used rather than WaveNet/Neural2 because they sit in
 * the largest recurring free-tier bucket — the reason this provider was
 * chosen over alternatives that only offer trial credit.
 */

const ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

/**
 * Indian-locale voices for the two languages an answer is ever produced in
 * (see src/lib/language.ts — `AnswerLanguage` is "en" | "hi"). en-IN rather
 * than en-US: this is an Indian government service, and the Indian English
 * voice is the appropriate register for it.
 */
const VOICES: Record<string, { languageCode: string; name: string }> = {
  en: { languageCode: "en-IN", name: "en-IN-Standard-A" },
  hi: { languageCode: "hi-IN", name: "hi-IN-Standard-A" },
};

export function voiceFor(language: string): { languageCode: string; name: string } {
  return VOICES[language] ?? VOICES.en;
}

export class GoogleTtsProvider implements TtsProvider {
  readonly name = "google-cloud-tts";

  constructor(
    private readonly apiKey: string | undefined = process.env.TTS_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs: number = 15_000,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async synthesize(req: SynthesisRequest): Promise<NormalizedSynthesis> {
    const start = Date.now();
    const voice = voiceFor(req.language);

    if (!this.isConfigured()) {
      return this.failure(start, voice.name, "not_configured: TTS_API_KEY not set");
    }
    if (!req.text.trim()) {
      return this.failure(start, voice.name, "empty_text");
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await this.fetchImpl(`${ENDPOINT}?key=${encodeURIComponent(this.apiKey!)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          input: { text: req.text },
          voice: { languageCode: voice.languageCode, name: voice.name },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        // The API key is in the query string, so the URL must never reach a
        // log or an error message.
        const detail = await res.text().catch(() => res.statusText);
        return this.failure(start, voice.name, `HTTP ${res.status}: ${detail.slice(0, 300)}`);
      }

      const body = (await res.json()) as { audioContent?: string };
      if (!body.audioContent) {
        return this.failure(start, voice.name, "no_audio_returned");
      }

      const binary = Buffer.from(body.audioContent, "base64");
      const audio = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;

      return {
        audio,
        mimeType: "audio/mpeg",
        provider: this.name,
        voice: voice.name,
        latencyMs: Date.now() - start,
        error: null,
      };
    } catch (err) {
      return this.failure(start, voice.name, err instanceof Error ? err.message : String(err));
    }
  }

  private failure(start: number, voice: string, error: string): NormalizedSynthesis {
    return {
      audio: null,
      mimeType: "audio/mpeg",
      provider: this.name,
      voice,
      latencyMs: Date.now() - start,
      error,
    };
  }
}
