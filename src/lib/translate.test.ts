import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { translateQueryToEnglish } from "./translate";
import { resetProviderCooldowns } from "./providers";

/**
 * These run with LLM_PROVIDER=none so the provider chain resolves empty and
 * no network call is attempted — exercising the Tier-0 degradation path the
 * PRD requires (translation is an enhancement, never a hard dependency).
 */
const prevProvider = process.env.LLM_PROVIDER;

beforeEach(() => {
  process.env.LLM_PROVIDER = "none";
  resetProviderCooldowns();
});
afterEach(() => {
  if (prevProvider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = prevProvider;
});

describe("translateQueryToEnglish", () => {
  test("English query is passed through untouched, no provider call", async () => {
    const r = await translateQueryToEnglish("helmet standard", "en");
    expect(r.translated).toBe(false);
    expect(r.method).toBe("skipped-not-needed");
    expect(r.queryForRetrieval).toBe("helmet standard");
  });

  test("Hindi query with no provider available falls back to the original text", async () => {
    const r = await translateQueryToEnglish("प्रेशर कुकर मानक", "hi");
    expect(r.translated).toBe(false);
    expect(r.method).toBe("skipped-no-provider");
    expect(r.queryForRetrieval).toBe("प्रेशर कुकर मानक");
    expect(r.originalQuery).toBe("प्रेशर कुकर मानक");
  });
});
