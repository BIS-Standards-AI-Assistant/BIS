import { describe, test, expect } from "vitest";
import { deriveAccessType } from "./reference-registry";

describe("deriveAccessType", () => {
  test("a real bis.gov.in URL is classified official_download", () => {
    expect(deriveAccessType("https://bis.gov.in/wp-content/uploads/2019/05/PM5522-final.pdf")).toBe("official_download");
  });

  test("a subdomain of bis.gov.in is still official_download", () => {
    expect(deriveAccessType("https://www.bis.gov.in/is-269-2015/?lang=en")).toBe("official_download");
  });

  test("a real non-BIS URL is classified external_access, never fabricated as official", () => {
    expect(deriveAccessType("https://archive.org/details/some-standard")).toBe("external_access");
  });

  test("no URL at all is unknown, never a guessed access type", () => {
    expect(deriveAccessType(null)).toBe("unknown");
  });

  test("a malformed URL string is unknown, not a crash", () => {
    expect(deriveAccessType("not a real url")).toBe("unknown");
  });
});
