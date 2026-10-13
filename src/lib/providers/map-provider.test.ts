import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { geocode, isMapProviderConfigured } from "./map-provider";

type Fetch = typeof fetch;

const OK_BODY = {
  status: "OK",
  results: [{ formatted_address: "Noida, Uttar Pradesh, India", geometry: { location: { lat: 28.57, lng: 77.32 } } }],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "secret-maps-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("geocode", () => {
  test("is blocked, without a request, when no key is configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "  ");
    const f = vi.fn<Fetch>();
    expect(isMapProviderConfigured()).toBe(false);
    const result = await geocode("Noida", f);
    expect(result).toMatchObject({ blocked: true, reason: "MAP_PROVIDER_BLOCKED" });
    expect(f).not.toHaveBeenCalled();
  });

  test("returns the top result's coordinates", async () => {
    const f = vi.fn<Fetch>().mockResolvedValue(json(OK_BODY));
    const result = await geocode("Noida", f);
    expect(result).toEqual({
      blocked: false,
      data: { latitude: 28.57, longitude: 77.32, formattedAddress: "Noida, Uttar Pradesh, India" },
    });
    const url = new URL(String(f.mock.calls[0][0]));
    expect(url.searchParams.get("address")).toBe("Noida");
  });

  test("an HTTP error is reported, not thrown", async () => {
    const f = vi.fn<Fetch>().mockResolvedValue(new Response("denied", { status: 403 }));
    expect(await geocode("Noida", f)).toMatchObject({ blocked: true, message: "Geocoding request failed (HTTP 403)." });
  });

  test("a network failure is reported, not thrown, and never echoes the keyed URL", async () => {
    const f = vi.fn<Fetch>().mockRejectedValue(
      new TypeError("fetch failed: https://maps.googleapis.com/...&key=secret-maps-key"),
    );
    const result = await geocode("Noida", f);
    expect(result).toMatchObject({ blocked: true, message: "Geocoding request failed." });
    expect(JSON.stringify(result)).not.toContain("secret-maps-key");
  });

  test("a request that never answers times out instead of stalling the caller", async () => {
    vi.useFakeTimers();
    const f = vi.fn<Fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_, reject) => {
          const signal = (init as RequestInit).signal!;
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    );
    const pending = geocode("Noida", f, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toMatchObject({ blocked: true, message: "Geocoding request timed out." });
  });

  test.each([
    ["a body that is not JSON", new Response("<html>oops</html>", { status: 200 })],
    ["a null body", json(null)],
    ["OK with no results array", json({ status: "OK" })],
    ["OK with an empty results array", json({ status: "OK", results: [] })],
    ["a non-OK provider status", json({ status: "ZERO_RESULTS", results: [] })],
  ])("%s is reported as not geocoded, not thrown", async (_label, response) => {
    const f = vi.fn<Fetch>().mockResolvedValue(response);
    const result = await geocode("Noida", f);
    expect(result.blocked).toBe(true);
  });
});
