// @vitest-environment node
import { describe, test, expect, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "./route";

const transcribe = vi.fn();
vi.mock("@/lib/stt", () => ({ getSttProvider: () => ({ isConfigured: () => true, transcribe }) }));

describe("POST /api/v1/transcribe", () => {
  test("a body declared far over the audio limit is refused before it is read", async () => {
    const formData = vi.fn();
    const req = { headers: new Headers({ "content-length": String(500 * 1024 * 1024) }), formData } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(formData).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });
});
