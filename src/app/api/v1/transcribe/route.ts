import { NextRequest, NextResponse } from "next/server";
import { getSttProvider } from "@/lib/stt";
import { VOICE_LANGUAGES } from "@/lib/speech/locales";
import { createRateLimiter, clientKeyFromHeaders } from "@/lib/rate-limit";
import { normalizeVoiceTranscript } from "@/lib/stt/voice-normalizer";

// Roughly 60s of Opus audio. A search query is a sentence, not a lecture —
// this bounds both the upload and the transcription bill.
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/**
 * This endpoint is public and spends money per call (upstream STT is
 * billed/quota'd per request), so it gets a throttle. Generous enough that
 * a person using voice search normally will never see it; tight enough
 * that a script pointed at the deployed URL can't drain the quota.
 * Module-scoped so the counter survives across requests.
 */
const RATE_LIMIT = Number(process.env.TRANSCRIBE_RATE_LIMIT ?? 15);
const RATE_WINDOW_MS = Number(process.env.TRANSCRIBE_RATE_WINDOW_MS ?? 60_000);
const limiter = createRateLimiter({ limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS });

const ALLOWED_MIME_PREFIXES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"];

const ALLOWED_LANGUAGES = new Set(VOICE_LANGUAGES.map((l) => l.code));

/**
 * Server-side speech-to-text, used as the fallback for browsers whose Web
 * Speech API is unavailable or non-functional — notably Brave, Arc and
 * plain Chromium, which expose `webkitSpeechRecognition` but ship without
 * Google's speech API key, so every call fails with a `network` error.
 */
export async function POST(req: NextRequest) {
  // Checked before any parsing or upstream work — a throttled request
  // should cost this server as little as possible.
  const rate = limiter.check(clientKeyFromHeaders(req.headers));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many voice requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const provider = getSttProvider();
  if (!provider.isConfigured()) {
    // 501, not 500: nothing is broken — this deployment simply hasn't
    // enabled server-side transcription. The client uses this to explain
    // the situation instead of showing a generic failure.
    return NextResponse.json(
      { error: "Server-side transcription is not configured on this deployment." },
      { status: 501 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with an 'audio' field." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'audio' file field." }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Recording is too long. Keep it under about a minute." }, { status: 413 });
  }

  const mimeType = audio.type || "audio/webm";
  if (!ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
    return NextResponse.json({ error: `Unsupported audio type: ${mimeType}` }, { status: 415 });
  }

  // Only languages the mic actually offers — prevents an arbitrary
  // attacker-supplied value being forwarded to the upstream API.
  const rawLanguage = form.get("language");
  const language = typeof rawLanguage === "string" && ALLOWED_LANGUAGES.has(rawLanguage) ? rawLanguage : undefined;

  try {
    const result = await provider.transcribe({
      audio: await audio.arrayBuffer(),
      mimeType,
      language,
    });

    if (result.error || !result.text) {
      console.error("[api/v1/transcribe]", result.error);
      return NextResponse.json(
        {
          error:
            result.error === "empty_transcript"
              ? "No speech was detected in the recording."
              : "Transcription failed.",
        },
        { status: result.error === "empty_transcript" ? 422 : 502 },
      );
    }

    // Generic transcription can't solve the domain-specific problem: a
    // spoken standard number arrives as "I S 4151" (or "आई एस ४१५१"), which
    // the identifier resolver would never match. The normalizer collapses
    // spoken acronyms and converts Indic numerals deterministically —
    // it never speculatively invents a standard number.
    const normalized = normalizeVoiceTranscript(result.text, language);

    return NextResponse.json({
      text: normalized.normalizedQuery || result.text,
      rawTranscript: normalized.originalTranscript,
      transformations: normalized.transformations,
      language: language ?? null,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error("[api/v1/transcribe]", err);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
