// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { __resetRateLimitsForTests } from "@/lib/rate-limit-http";

const analyzeDocumentText = vi.fn();
vi.mock("@/lib/document-analyzer", () => ({ analyzeDocumentText: (...a: unknown[]) => analyzeDocumentText(...a) }));

function upload(file: File) {
  const form = new FormData();
  form.append("file", file);
  return new NextRequest(new Request("http://localhost/api/v1/analyze-document", { method: "POST", body: form }));
}

/** A request whose Content-Length is a lie — formData() must never be reached. */
function declaredSize(bytes: number) {
  const formData = vi.fn();
  const req = { headers: new Headers({ "content-length": String(bytes) }), formData } as unknown as NextRequest;
  return { req, formData };
}

beforeEach(() => {
  __resetRateLimitsForTests();
  analyzeDocumentText.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/v1/analyze-document", () => {
  test("a plain-text document is analysed", async () => {
    analyzeDocumentText.mockResolvedValue({ identifiersFound: [], standards: [] });
    const res = await POST(upload(new File(["Complies with IS 14543:2016."], "spec.txt", { type: "text/plain" })));
    expect(res.status).toBe(200);
    expect(analyzeDocumentText).toHaveBeenCalledWith("Complies with IS 14543:2016.");
  });

  test("an empty file is a 400", async () => {
    const res = await POST(upload(new File([], "empty.txt", { type: "text/plain" })));
    expect(res.status).toBe(400);
  });

  test("an unsupported type is a 415", async () => {
    const res = await POST(upload(new File(["x"], "sheet.xlsx", { type: "application/vnd.ms-excel" })));
    expect(res.status).toBe(415);
  });

  test("a file declared as PDF without a PDF header is a 422", async () => {
    const res = await POST(upload(new File(["not a pdf"], "fake.pdf", { type: "application/pdf" })));
    expect(res.status).toBe(422);
    expect(analyzeDocumentText).not.toHaveBeenCalled();
  });

  test("a body declared far over the limit is refused before it is read", async () => {
    const { req, formData } = declaredSize(2 * 1024 * 1024 * 1024);
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(formData).not.toHaveBeenCalled();
  });

  test("a body just over the file limit is still read, so multipart framing never causes a false 413", async () => {
    const { req, formData } = declaredSize(10 * 1024 * 1024 + 2_000);
    formData.mockRejectedValue(new Error("stop here"));
    const res = await POST(req);
    expect(formData).toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  test("an analysis failure is a 500 that does not leak the underlying error", async () => {
    analyzeDocumentText.mockRejectedValue(new Error('relation "standards" does not exist at ep-host.neon.tech'));
    const res = await POST(upload(new File(["IS 1293"], "spec.txt", { type: "text/plain" })));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Document analysis failed" });
    expect(console.error).toHaveBeenCalled();
  });
});
