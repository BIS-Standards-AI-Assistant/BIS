import { describe, test, expect } from "vitest";
import {
  QueryIntentSchema,
  OFF_TOPIC_PATTERN,
  deterministicIntentFastPath,
  deterministicIntentFallback,
} from "./intent";

describe("deterministicIntentFastPath", () => {
  test("a bare standard identifier skips the LLM entirely", () => {
    const intent = deterministicIntentFastPath("IS 14543");
    expect(intent).not.toBeNull();
    expect(intent!.intent).toBe("find_applicable_standard");
    expect(intent!.searchQuery).toBe("IS 14543");
    expect(intent!.isRelevant).toBe(true);
  });

  test("an identifier with up to three extra words still takes the fast path", () => {
    expect(deterministicIntentFastPath("IS 14543:2016 scope")).not.toBeNull();
    expect(deterministicIntentFastPath("show me IS 1293 please")).not.toBeNull();
  });

  test("a real question around the identifier goes to the LLM instead", () => {
    expect(deterministicIntentFastPath("what does IS 14543 say about packaged drinking water labels")).toBeNull();
  });

  test("no identifier, or more than one, never takes the fast path", () => {
    expect(deterministicIntentFastPath("steel water bottle")).toBeNull();
    expect(deterministicIntentFastPath("IS 1293 and IS 302")).toBeNull();
  });

  test("the fast-path result is a valid QueryIntent with nothing invented", () => {
    const intent = deterministicIntentFastPath("IS 14543")!;
    expect(QueryIntentSchema.safeParse(intent).success).toBe(true);
    expect(intent.product).toBeNull();
    expect(intent.material).toBeNull();
    expect(intent.missingInformation).toEqual([]);
  });
});

describe("OFF_TOPIC_PATTERN", () => {
  test.each(["chocolate cake recipe", "weather in Delhi tomorrow", "cricket match score", "write python code", "bitcoin price"])(
    "flags %j",
    (q) => {
      expect(OFF_TOPIC_PATTERN.test(q)).toBe(true);
    },
  );

  test.each(["LED bulb", "pressure cooker standard", "IS 2082 water heater", "how heavy is this thing allowed to be?"])(
    "does not flag %j",
    (q) => {
      expect(OFF_TOPIC_PATTERN.test(q)).toBe(false);
    },
  );

  test.each(["Who is eligible for a BIS licence?", "who is responsible for testing helmets?"])(
    "a 'who is' question about BIS is not off-topic: %j",
    (q) => {
      expect(OFF_TOPIC_PATTERN.test(q)).toBe(false);
      expect(deterministicIntentFallback(q).isRelevant).toBe(true);
    },
  );

  test("matches whole words only", () => {
    // "cooker" must not trip the "cook" keyword — pressure cookers are a core BIS product.
    expect(OFF_TOPIC_PATTERN.test("cooker")).toBe(false);
    expect(OFF_TOPIC_PATTERN.test("cooking")).toBe(false);
  });
});

describe("deterministicIntentFallback", () => {
  test("an off-topic query is marked irrelevant with a guiding message", () => {
    const intent = deterministicIntentFallback("what's the weather forecast?");
    expect(intent.isRelevant).toBe(false);
    expect(intent.intent).toBe("unclear");
    expect(intent.relevanceMessage).toMatch(/not appear to be relevant/);
    expect(intent.missingInformation).toEqual([]);
  });

  test.each([
    ["ISI mark licence for helmets", "certification_process", true, false],
    ["How do I get certified for cement?", "certification_process", true, false],
    ["testing requirements for LED bulbs", "testing_requirements", false, true],
    ["how many samples are needed for cement", "testing_requirements", false, true],
    ["steel water bottle", "find_applicable_standard", false, false],
  ] as const)("%j -> %s", (query, expectedIntent, cert, testing) => {
    const intent = deterministicIntentFallback(query);
    expect(intent.intent).toBe(expectedIntent);
    expect(intent.certificationRequested).toBe(cert);
    expect(intent.testingRequested).toBe(testing);
    expect(intent.isRelevant).toBe(true);
    expect(intent.searchQuery).toBe(query);
  });

  test("certification takes priority over testing when both are asked about", () => {
    const intent = deterministicIntentFallback("test and certification for helmets");
    expect(intent.intent).toBe("certification_process");
    expect(intent.certificationRequested).toBe(true);
    expect(intent.testingRequested).toBe(true);
  });

  test("never guesses product, material, use case, user or sector", () => {
    const intent = deterministicIntentFallback("stainless steel water bottle for children");
    expect(intent.product).toBeNull();
    expect(intent.material).toBeNull();
    expect(intent.useCase).toBeNull();
    expect(intent.targetUser).toBeNull();
    expect(intent.sector).toBeNull();
  });

  test("offers concrete product refinements, not generic placeholders", () => {
    const refinements = deterministicIntentFallback("helmet").missingInformation;
    expect(refinements.length).toBeGreaterThan(0);
    for (const generic of ["intended use", "material grade", "capacity", "size"]) {
      expect(refinements.map((r) => r.toLowerCase())).not.toContain(generic);
    }
  });

  test("always returns a schema-valid QueryIntent", () => {
    for (const q of ["", "weather", "helmet", "testing cement", "ISI licence"]) {
      expect(QueryIntentSchema.safeParse(deterministicIntentFallback(q)).success).toBe(true);
    }
  });
});
