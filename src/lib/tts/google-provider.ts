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

/**
 * The API refuses any request whose input text exceeds 5,000 bytes — bytes
 * of UTF-8, not characters. /api/v1/speak accepts up to 3,000 characters,
 * which fits in English but not in Hindi: Devanagari takes three bytes a
 * character, so a long Hindi answer runs to about 9,000 bytes.
 */
export const MAX_INPUT_BYTES = 5000;

const utf8Length = (text: string) => Buffer.byteLength(text, "utf8");

/**
 * Splits text into pieces of at most `maxBytes` UTF-8 bytes. Breaks after a
 * sentence end (including the Devanagari danda) where it can, then at a
 * space, and inside a word only as a last resort — so each piece still
 * sounds natural when it is spoken on its own.
 */
export function splitForSynthesis(text: string, maxBytes: number = MAX_INPUT_BYTES): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (utf8Length(trimmed) <= maxBytes) return [trimmed];

  const pieces: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim()) pieces.push(current.trim());
    current = "";
  };
  const add = (unit: string) => {
    if (utf8Length(current + unit) <= maxBytes) {
      current += unit;
      return;
    }
    flush();
    if (utf8Length(unit) <= maxBytes) {
      current = unit;
      return;
    }
    // Too long on its own: split it more finely.
    const words = unit.split(/(?<=\s)/);
    if (words.length > 1) {
      for (const word of words) add(word);
      return;
    }
    for (const ch of unit) {
      if (utf8Length(current + ch) > maxBytes) flush();
      current += ch;
    }
  };

  for (const sentence of trimmed.split(/(?<=[.!?।॥\n])\s*/)) add(`${sentence} `);
  flush();
  return pieces;
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

    const parts: Uint8Array[] = [];
    for (const piece of splitForSynthesis(req.text)) {
      const part = await this.request(piece, voice);
      if ("error" in part) return this.failure(start, voice.name, part.error);
      parts.push(part.audio);
    }

    // MP3 is a sequence of self-contained frames, so the pieces play back
    // as a single file when their bytes are joined.
    const audio = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
    let offset = 0;
    for (const p of parts) {
      audio.set(p, offset);
      offset += p.byteLength;
    }

    return {
      audio: audio.buffer,
      mimeType: "audio/mpeg",
      provider: this.name,
      voice: voice.name,
      latencyMs: Date.now() - start,
      error: null,
    };
  }

  /** One API call for text already known to fit within MAX_INPUT_BYTES. */
  private async request(
    text: string,
    voice: { languageCode: string; name: string },
  ): Promise<{ audio: Uint8Array } | { error: string }> {
    const controller = new AbortController();
    // Cleared only once the body has been read: a response that stalls
    // after its headers would otherwise hang the request indefinitely.
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${ENDPOINT}?key=${encodeURIComponent(this.apiKey!)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: voice.languageCode, name: voice.name },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });

      if (!res.ok) {
        // The API key is in the query string, so the URL must never reach a
        // log or an error message.
        const detail = await res.text().catch(() => res.statusText);
        return { error: `HTTP ${res.status}: ${detail.slice(0, 300)}` };
      }

      const body = (await res.json()) as { audioContent?: string };
      if (!body.audioContent) return { error: "no_audio_returned" };
      return { audio: new Uint8Array(Buffer.from(body.audioContent, "base64")) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    } finally {
      clearTimeout(timeout);
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
