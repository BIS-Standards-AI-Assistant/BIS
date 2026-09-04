import { NextRequest, NextResponse } from "next/server";
import { rateLimitOrNull } from "@/lib/rate-limit-http";
import { getSTTProvider } from "@/lib/stt/stt-provider";
import { normalizeVoiceTranscript } from "@/lib/stt/voice-normalizer";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_PREFIXES = ["audio/"];
const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/flac",
  "video/webm", // MediaRecorder in some Chromium builds sets video/webm even for audio-only
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Rate limiting: 20 voice transcription requests per minute per IP
  const limited = rateLimitOrNull(req, "stt", { limit: 20, windowMs: 60000 });
  if (limited) return limited;

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");
    const requestedLanguage = (formData.get("language") as string) || "auto";

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing audio file in form field 'audio'" },
        { status: 400 }
      );
    }

    // 2. Validate payload size
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: "Audio file is empty" },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `Audio file exceeds maximum size limit of ${MAX_AUDIO_BYTES / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // 3. Validate MIME type
    const mimeType = (audioFile.type || "audio/wav").split(";")[0].toLowerCase().trim();
    const isAllowedMime =
      ALLOWED_MIME_TYPES.has(mimeType) ||
      ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

    if (!isAllowedMime) {
      return NextResponse.json(
        { error: `Unsupported audio MIME type: ${mimeType}` },
        { status: 415 }
      );
    }

    // 4. Extract buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Invoke STT provider
    const provider = getSTTProvider();
    const result = await provider.transcribe(
      {
        buffer,
        mimeType,
        fileName: (audioFile as File).name || "recording.wav",
      },
      {
        language: requestedLanguage !== "auto" ? requestedLanguage : undefined,
      }
    );

    // 6. Apply deterministic voice normalization
    const normalized = normalizeVoiceTranscript(result.text, result.language);

    return NextResponse.json({
      text: normalized.normalizedQuery,
      rawText: result.text,
      language: result.language || requestedLanguage,
      confidence: result.confidence,
      durationMs: result.durationMs,
      provider: result.provider,
      transformations: normalized.transformations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("STT_PROVIDER_DISABLED") || message.includes("STT_SERVICE_UNCONFIGURED")) {
      return NextResponse.json(
        {
          error: "Voice search is currently unavailable. Please search by typing.",
          code: "STT_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    if (message.includes("STT_TIMEOUT")) {
      return NextResponse.json(
        {
          error: "Voice transcription timed out. Please try again.",
          code: "STT_TIMEOUT",
        },
        { status: 504 }
      );
    }

    if (message.includes("AUDIO_PAYLOAD_TOO_LARGE")) {
      return NextResponse.json(
        { error: "Audio file too large for provider", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      );
    }

    if (message.includes("UNSUPPORTED_AUDIO_FORMAT")) {
      return NextResponse.json(
        { error: "Unsupported audio format for provider", code: "UNSUPPORTED_FORMAT" },
        { status: 415 }
      );
    }

    console.error("[api/v1/stt] transcription error:", message);
    return NextResponse.json(
      {
        error: "Voice transcription failed. You can continue by typing.",
        code: "STT_FAILED",
      },
      { status: 500 }
    );
  }
}
