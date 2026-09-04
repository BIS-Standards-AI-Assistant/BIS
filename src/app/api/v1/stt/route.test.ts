// @vitest-environment node
import { describe, test, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { GET as healthGET } from "./health/route";
import { NextRequest } from "next/server";
import { setCustomSTTProvider } from "@/lib/stt/stt-provider";
import { MockSTTProvider } from "@/lib/stt/mock-stt-provider";
import { __resetRateLimitsForTests } from "@/lib/rate-limit-http";

function createMultipartRequest(
  audioContent: Buffer | null,
  mimeType = "audio/wav",
  language = "auto",
  fileName = "query.wav"
): NextRequest {
  const formData = new FormData();
  if (audioContent !== null) {
    const blob = new Blob([new Uint8Array(audioContent)], { type: mimeType });
    formData.append("audio", blob, fileName);
  }
  if (language) {
    formData.append("language", language);
  }

  // Create native Request with formData body
  const nativeReq = new Request("http://localhost:3000/api/v1/stt", {
    method: "POST",
    body: formData,
  });

  return new NextRequest(nativeReq);
}

describe("POST /api/v1/stt", () => {
  beforeEach(() => {
    __resetRateLimitsForTests();
    setCustomSTTProvider(null);
  });

  test("returns 400 when body is not multipart/form-data", async () => {
    const req = new NextRequest(
      new Request("http://localhost:3000/api/v1/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: "base64" }),
      })
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("multipart/form-data");
  });

  test("returns 400 when audio file is missing", async () => {
    const req = createMultipartRequest(null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing audio file");
  });

  test("returns 400 when audio file is empty (0 bytes)", async () => {
    const req = createMultipartRequest(Buffer.alloc(0));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Audio file is empty");
  });

  test("returns 413 when audio file exceeds max size limit", async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024); // 11MB
    const req = createMultipartRequest(oversized);
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("exceeds maximum size limit");
  });

  test("returns 415 for unsupported MIME types (e.g. text/plain, image/png)", async () => {
    const req = createMultipartRequest(Buffer.from("not audio"), "text/plain", "en", "doc.txt");
    const res = await POST(req);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain("Unsupported audio MIME type");
  });

  test("returns 503 when STT provider is disabled or unavailable", async () => {
    // Default STT_PROVIDER="none"
    const req = createMultipartRequest(Buffer.from("valid audio bytes"));
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("STT_UNAVAILABLE");
  });

  test("transcribes valid audio and applies voice normalization", async () => {
    setCustomSTTProvider(
      new MockSTTProvider({
        defaultTranscript: "आई एस ४१५१ का सर्टिफिकेशन प्रोसेस क्या है?",
        defaultLanguage: "hi",
      })
    );

    const req = createMultipartRequest(Buffer.from("valid-audio"), "audio/webm", "hi");
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    // Deterministic voice normalization: "आई एस ४१५१" -> "IS 4151"
    expect(body.text).toBe("IS 4151 का सर्टिफिकेशन प्रोसेस क्या है");
    expect(body.rawText).toBe("आई एस ४१५१ का सर्टिफिकेशन प्रोसेस क्या है?");
    expect(body.language).toBe("hi");
    expect(body.confidence).toBeNull();
    expect(body.transformations).toContain("devanagari_is_to_ascii");
    expect(body.transformations).toContain("indic_digits_to_ascii");
  });

  test("enforces rate limiting on repeated requests", async () => {
    setCustomSTTProvider(new MockSTTProvider());

    // 20 requests allowed per window
    for (let i = 0; i < 20; i++) {
      const req = createMultipartRequest(Buffer.from("audio"));
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 21st request should be rate-limited (429)
    const blockedReq = createMultipartRequest(Buffer.from("audio"));
    const blockedRes = await POST(blockedReq);
    expect(blockedRes.status).toBe(429);
  });
});

describe("GET /api/v1/stt/health", () => {
  beforeEach(() => {
    setCustomSTTProvider(null);
  });

  test("reports unavailable when default provider is none", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.provider).toBe("none");
  });

  test("reports available when mock provider is active", async () => {
    setCustomSTTProvider(new MockSTTProvider());
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.provider).toBe("mock");
  });
});
