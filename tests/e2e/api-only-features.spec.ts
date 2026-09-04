import { test, expect } from "./fixtures/test-base";
import path from "path";
import { KNOWN_QUERIES, FABRICATED_STANDARD, LAB_SEARCH_LOCATION } from "./fixtures/known-data";

/**
 * Journeys G, H, I, J, K, L. No UI page exists yet for Product Analyzer,
 * Document Analyzer, or Laboratory Finder/Map (confirmed by repo search
 * this session — src/app/ has no analyze-product/analyze-document/
 * find-laboratories page, only the API routes). Per the task's own rule
 * ("PARTIAL features must receive coverage for their implemented
 * portion" / "do not pretend there is a guided multi-step UI if there
 * isn't one"), these are tested at the real API level, against the real
 * backend and real database — not as fake UI-existence checks.
 */

test.describe("Journey G/H: Document Analyzer — real upload, real identifier matching", () => {
  test("uploading a real document with a fabricated identifier reports it as not-in-database, never as a match", async ({ request }) => {
    const res = await request.post("/api/v1/analyze-document", {
      multipart: {
        file: {
          name: "sample-spec.txt",
          mimeType: "text/plain",
          buffer: (await import("fs")).readFileSync(path.join(__dirname, "fixtures", "sample-spec.txt")),
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    const realMatch = body.identifiersFound.find((m: { resolvedNumber: string }) => m.resolvedNumber === "IS 14543:2016");
    expect(realMatch?.inDatabase).toBe(true);

    const fabricated = body.identifiersFound.find((m: { resolvedNumber: string }) => m.resolvedNumber === FABRICATED_STANDARD);
    expect(fabricated?.inDatabase).toBe(false);
    expect(fabricated?.standardId).toBeNull();

    expect(body.limitations.some((l: string) => l.includes("do not match a standard"))).toBe(true);
  });

  test("empty file is rejected, not silently accepted as zero results", async ({ request }) => {
    const res = await request.post("/api/v1/analyze-document", {
      multipart: { file: { name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) } },
    });
    expect(res.status()).toBe(400);
  });

  test("oversized file is rejected with a clear size-limit error", async ({ request }) => {
    const big = Buffer.alloc(11 * 1024 * 1024, "a");
    const res = await request.post("/api/v1/analyze-document", {
      multipart: { file: { name: "big.txt", mimeType: "text/plain", buffer: big } },
    });
    expect(res.status()).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("exceeds");
  });

  test("unsupported file type is rejected", async ({ request }) => {
    const res = await request.post("/api/v1/analyze-document", {
      multipart: { file: { name: "fake.html", mimeType: "text/html", buffer: Buffer.from("<html>fake</html>") } },
    });
    expect(res.status()).toBe(415);
  });

  test("a file declared as PDF but missing the %PDF- header is rejected as malformed, not parsed as garbage", async ({ request }) => {
    const res = await request.post("/api/v1/analyze-document", {
      multipart: { file: { name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a real pdf") } },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("not a valid PDF");
  });
});

test.describe("Journey E (API): Product Analyzer", () => {
  test("a real product description returns applicability-labeled standards, VERIFIED != invented", async ({ request }) => {
    const res = await request.post("/api/v1/analyze-product", {
      data: { productDescription: "Stainless steel drinking water bottle" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.standards)).toBe(true);
    for (const s of body.standards) {
      expect(["VERIFIED", "POTENTIAL", "RELATED", "UNKNOWN"]).toContain(s.label);
    }
    // Trust regression: the known material-mismatch standard must be
    // labeled RELATED (mismatch), never VERIFIED, for a steel product.
    const mismatch = body.standards.find((s: { standardNumber: string }) => s.standardNumber === "IS 15410:2003");
    if (mismatch) expect(mismatch.label).toBe("RELATED");
  });
});

test.describe("Journey I/J: Certification and Testing reachability", () => {
  test("a certification-flavored query surfaces real scheme data, no LLM required", async ({ request }) => {
    const res = await request.post("/api/v1/query", { data: { query: KNOWN_QUERIES.helmetCertification } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.certification.available).toBe(true);
    expect(body.certification.notes).toMatch(/Scheme-I|Scheme-II|CRS|Hallmarking/);
  });

  test("a testing-flavored query surfaces real testing parameters", async ({ request }) => {
    const res = await request.post("/api/v1/query", { data: { query: KNOWN_QUERIES.helmetTestingAndCertification } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.testing.available).toBe(true);
    expect(typeof body.testing.notes).toBe("string");
  });
});

test.describe("Journey K: Laboratory Finder — real dataset, honest scope limits", () => {
  test("laboratory search returns real matches from the recognised-laboratory dataset, not fabricated ones", async ({ request }) => {
    const res = await request.post("/api/v1/find-laboratories", {
      data: { location: LAB_SEARCH_LOCATION, standardNumber: KNOWN_QUERIES.exactStandard },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.laboratoryDataAvailable).toBe(true);
    expect(Array.isArray(body.laboratories)).toBe(true);
    expect(body.laboratories.length).toBeGreaterThan(0);
    for (const lab of body.laboratories) {
      const matchesLocation =
        lab.state.toLowerCase().includes(LAB_SEARCH_LOCATION.toLowerCase()) ||
        (lab.city ?? "").toLowerCase().includes(LAB_SEARCH_LOCATION.toLowerCase());
      expect(matchesLocation).toBe(true);
      // standardNumber must never narrow results to a claimed capability —
      // the source dataset has no per-standard testing-scope field.
      expect(lab).not.toHaveProperty("standards");
      expect(lab).not.toHaveProperty("testingScope");
    }
    expect(body.testingScopeNote).toMatch(/does not indicate which standards/i);
  });

  test("an unmatched location reports the gap honestly, not a silent empty list", async ({ request }) => {
    const res = await request.post("/api/v1/find-laboratories", {
      data: { location: "Nowhereistan-Not-A-Real-Place" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.laboratories).toEqual([]);
    expect(body.message).toMatch(/no recognised laboratory matched/i);
  });
});

test.describe("Journey L: Map Locator — MAP_PROVIDER_BLOCKED", () => {
  test("map/geocoding is reported as blocked when no API key is configured, never a fabricated coordinate", async ({ request }) => {
    const res = await request.post("/api/v1/find-laboratories", {
      data: { location: LAB_SEARCH_LOCATION },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // This assertion documents the current real state of this
    // environment (no GOOGLE_MAPS_API_KEY set) — if a key is added later,
    // this specific assertion should be revisited, not silently left
    // green on stale reasoning.
    expect(body.mapProvider.configured).toBe(false);
    expect(body.mapProvider.blockedReason).toBe("MAP_PROVIDER_BLOCKED");
    expect(body.mapProvider.geocoded).toBeNull();
  });
});
