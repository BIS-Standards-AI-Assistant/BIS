import { describe, test, expect, vi } from "vitest";
import { GoogleTtsProvider, MAX_INPUT_BYTES, splitForSynthesis } from "./google-provider";

type Fetch = typeof fetch;

const bytes = (s: string) => Buffer.byteLength(s, "utf8");

// "Packaged drinking water must be certified." — 3 bytes per Devanagari character.
const HINDI_SENTENCE = "पैकेज्ड पेयजल का प्रमाणन अनिवार्य है।";

/** Answers each call with the bytes of its own input text, so joins can be checked. */
function echo() {
  return vi.fn<Fetch>().mockImplementation(async (_url, init) => {
    const { input } = JSON.parse((init as RequestInit).body as string);
    const audioContent = Buffer.from(`[${input.text.length}]`).toString("base64");
    return new Response(JSON.stringify({ audioContent }), { status: 200 });
  });
}

describe("splitForSynthesis", () => {
  test("text within the limit is sent as one piece", () => {
    expect(splitForSynthesis("  Packaged drinking water.  ")).toEqual(["Packaged drinking water."]);
    expect(splitForSynthesis("   ")).toEqual([]);
  });

  test("a 3,000-character Hindi answer exceeds the byte limit and is split under it", () => {
    let text = "";
    while (text.length + HINDI_SENTENCE.length + 1 <= 3000) text += `${HINDI_SENTENCE} `;
    expect(text.length).toBeLessThanOrEqual(3000);
    expect(bytes(text)).toBeGreaterThan(MAX_INPUT_BYTES);

    const pieces = splitForSynthesis(text);
    expect(pieces.length).toBeGreaterThan(1);
    for (const p of pieces) expect(bytes(p)).toBeLessThanOrEqual(MAX_INPUT_BYTES);
    // Broken at sentence ends: every piece ends on a danda.
    for (const p of pieces) expect(p.endsWith("।")).toBe(true);
    expect(pieces.join(" ").replace(/\s+/g, " ")).toBe(text.trim().replace(/\s+/g, " "));
  });

  test("a sentence longer than the limit is split at spaces", () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    const pieces = splitForSynthesis(words, 60);
    for (const p of pieces) expect(bytes(p)).toBeLessThanOrEqual(60);
    expect(pieces.join(" ")).toBe(words);
  });

  test("a single word longer than the limit is split without breaking a character", () => {
    const word = "अ".repeat(30); // 90 bytes
    const pieces = splitForSynthesis(word, 20);
    for (const p of pieces) expect(bytes(p)).toBeLessThanOrEqual(20);
    expect(pieces.join("")).toBe(word);
  });
});

describe("GoogleTtsProvider with long input", () => {
  test("synthesizes each piece and joins the audio in order", async () => {
    const text = `${HINDI_SENTENCE} `.repeat(80);
    const f = echo();
    const result = await new GoogleTtsProvider("k", f).synthesize({ text, language: "hi" });

    expect(result.error).toBeNull();
    const pieces = splitForSynthesis(text);
    expect(f).toHaveBeenCalledTimes(pieces.length);
    for (const [, init] of f.mock.calls) {
      const sent = JSON.parse((init as RequestInit).body as string);
      expect(bytes(sent.input.text)).toBeLessThanOrEqual(MAX_INPUT_BYTES);
    }
    expect(Buffer.from(result.audio!).toString()).toBe(pieces.map((p) => `[${p.length}]`).join(""));
  });

  test("a failure on any piece fails the whole synthesis rather than returning partial audio", async () => {
    const text = `${HINDI_SENTENCE} `.repeat(80);
    const f = echo();
    f.mockImplementationOnce(echo()).mockResolvedValueOnce(new Response("quota exceeded", { status: 429 }));
    const result = await new GoogleTtsProvider("k", f).synthesize({ text, language: "hi" });
    expect(result.audio).toBeNull();
    expect(result.error).toMatch(/HTTP 429/);
  });
});

test("the timeout also covers a response body that never finishes", async () => {
  vi.useFakeTimers();
  try {
    const f = vi.fn<Fetch>().mockImplementation(async (_url, init) => {
      const signal = (init as RequestInit).signal!;
      const res = new Response("{}", { status: 200 });
      // Headers arrive; the body then stalls until the request is aborted.
      Object.defineProperty(res, "json", {
        value: () =>
          new Promise((_, reject) =>
            signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
          ),
      });
      return res;
    });
    const pending = new GoogleTtsProvider("k", f, 1000).synthesize({ text: "hello", language: "en" });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;
    expect(result.audio).toBeNull();
    expect(result.error).toMatch(/aborted/);
  } finally {
    vi.useRealTimers();
  }
});
