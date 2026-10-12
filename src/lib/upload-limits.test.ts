import { describe, test, expect } from "vitest";
import { declaredBodyTooLarge } from "./upload-limits";

const MB = 1024 * 1024;
const headers = (contentLength?: string) => new Headers(contentLength === undefined ? {} : { "content-length": contentLength });

describe("declaredBodyTooLarge", () => {
  test("allows a body up to the file limit plus multipart framing", () => {
    expect(declaredBodyTooLarge(headers(String(10 * MB)), 10 * MB)).toBe(false);
    expect(declaredBodyTooLarge(headers(String(10 * MB + 60 * 1024)), 10 * MB)).toBe(false);
  });

  test("refuses a body clearly over the limit", () => {
    expect(declaredBodyTooLarge(headers(String(11 * MB)), 10 * MB)).toBe(true);
    expect(declaredBodyTooLarge(headers(String(5 * 1024 * MB)), 10 * MB)).toBe(true);
  });

  test("without a usable Content-Length it defers to the post-parse size check", () => {
    expect(declaredBodyTooLarge(headers(), 10 * MB)).toBe(false);
    expect(declaredBodyTooLarge(headers("not-a-number"), 10 * MB)).toBe(false);
  });
});
