import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { getTtsProvider } from "@/lib/tts";
import { createRateLimiter, clientKeyFromHeaders } from "@/lib/rate-limit";

// An answer is a few paragraphs at most. Bounding this bounds the bill,
// since the upstream free tier is measured in characters.
const MAX_TEXT_LENGTH = 3000;

const SpeakRequestSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  language: z.enum(["en", "hi"]).optional(),
});

/**
 * Public and metered upstream, so it gets the same throttle shape as
 * /api/v1/transcribe.
 */
const RATE_LIMIT = Number(process.env.SPEAK_RATE_LIMIT ?? 20);
const RATE_WINDOW_MS = Number(process.env.SPEAK_RATE_WINDOW_MS ?? 60_000);
const limiter = createRateLimiter({ limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS });

/**
 * Identical answers are read aloud repeatedly — the same result re-opened,
 * several people asking the same common question — so synthesized audio is
 * cached in memory by (text, language). Every hit is a character quota not
 * spent and a round-trip the user doesn't wait for.
 *
 * Deliberately small and process-local: this app ships as a single
 * container (see Dockerfile), so a bounded map is a real cache rather than
 * a decorative one. It resets on restart, which costs nothing but a
 * regeneration.
 */
const CACHE_LIMIT = 50;
const audioCache = new Map<string, { audio: ArrayBuffer; mimeType: string }>();

function cacheKey(text: string, language: string): string {
  return createHash("sha256").update(`${language}::${text}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const rate = limiter.check(clientKeyFromHeaders(req.headers));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many read-aloud requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const parsed = SpeakRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const provider = getTtsProvider();
  if (!provider.isConfigured()) {
    // 501, not 500 — nothing is broken, read-aloud simply isn't enabled on
    // this deployment. The client uses this to fall back to browser speech
    // rather than showing a failure.
    return NextResponse.json(
      { error: "Server-side read-aloud is not configured on this deployment." },
      { status: 501 },
    );
  }

  const { text } = parsed.data;
  const language = parsed.data.language ?? "en";
  const key = cacheKey(text, language);

  const cached = audioCache.get(key);
  if (cached) {
    return new NextResponse(cached.audio, {
      headers: { "Content-Type": cached.mimeType, "X-Cache": "hit" },
    });
  }

  const result = await provider.synthesize({ text, language });
  if (result.error || !result.audio) {
    console.error("[api/v1/speak]", result.error);
    return NextResponse.json({ error: "Could not generate audio for this answer." }, { status: 502 });
  }

  if (audioCache.size >= CACHE_LIMIT) {
    // Simple FIFO eviction — insertion order is Map's iteration order.
    const oldest = audioCache.keys().next().value;
    if (oldest) audioCache.delete(oldest);
  }
  audioCache.set(key, { audio: result.audio, mimeType: result.mimeType });

  return new NextResponse(result.audio, {
    headers: { "Content-Type": result.mimeType, "X-Cache": "miss" },
  });
}
