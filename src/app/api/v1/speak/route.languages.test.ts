// @vitest-environment node
import { test, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const synthesize = vi.fn();
vi.mock("@/lib/tts", () => ({
  getTtsProvider: () => ({ name: "fake", isConfigured: () => true, synthesize }),
}));

import { POST } from "./route";

function speak(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/v1/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
      body: JSON.stringify(body),
    }),
  );
}

test.each(["bn", "ta", "te", "mr", "gu", "kn"])("an answer in %s can be read aloud", async (language) => {
  synthesize.mockResolvedValueOnce({ audio: new Uint8Array([1, 2, 3]).buffer, mimeType: "audio/mpeg", error: null });
  const res = await speak({ text: `answer in ${language}`, language });
  expect(res.status).toBe(200);
  expect(synthesize).toHaveBeenLastCalledWith({ text: `answer in ${language}`, language });
});

test("a language with no voice is still refused", async () => {
  synthesize.mockClear();
  const res = await speak({ text: "hello", language: "pa" });
  expect(res.status).toBe(400);
  expect(synthesize).not.toHaveBeenCalled();
});
