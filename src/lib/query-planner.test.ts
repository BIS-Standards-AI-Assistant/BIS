import { describe, test, expect } from "vitest";
import { planQuery } from "./query-planner";

describe("planQuery", () => {
  test("classifies a bare standard identifier as EXACT_STANDARD / SIMPLE, no LLM required", () => {
    const plan = planQuery("IS 5522:2014");
    expect(plan.type).toBe("EXACT_STANDARD");
    expect(plan.complexity).toBe("SIMPLE");
    expect(plan.identifiers).toEqual(["IS 5522:2014"]);
    expect(plan.requiresLLM).toBe(false);
    expect(plan.retrievalTasks).toContain("getStandard");
  });

  test("classifies 'what does IS 5522 cover?' as still simple per the spec's own example", () => {
    const plan = planQuery("What does IS 5522 cover?");
    expect(plan.complexity).toBe("SIMPLE");
  });

  test("classifies a product-discovery question without an identifier", () => {
    const plan = planQuery("Which BIS standard applies to stainless steel bottles?");
    expect(plan.type).toBe("PRODUCT_DISCOVERY");
    expect(plan.identifiers).toEqual([]);
    expect(plan.requiresLLM).toBe(true);
  });

  test("classifies a certification question", () => {
    const plan = planQuery("How do I get BIS certification for electric kettles?");
    expect(plan.type).toBe("CERTIFICATION");
    expect(plan.retrievalTasks).toContain("getCertificationScheme");
  });

  test("classifies a compound certification+testing+laboratory question as COMPLEX", () => {
    const plan = planQuery("How do I obtain BIS certification for my product and which laboratories can test it?");
    expect(plan.complexity).toBe("COMPLEX");
  });

  test("classifies a QCO/mandatory-status question tied to an identifier", () => {
    const plan = planQuery("Is IS 15410:2003 mandatory under a QCO?");
    expect(plan.type).toBe("QCO");
    expect(plan.retrievalTasks).toContain("checkMandatoryStatus");
  });

  test("classifies a comparison between two identifiers", () => {
    const plan = planQuery("IS 5522:2014 vs IS 14756:2017");
    expect(plan.type).toBe("COMPARISON");
    expect(plan.retrievalTasks).toContain("compareStandards");
  });

  test("classifies an amendment-history question", () => {
    const plan = planQuery("Has IS 302 (Part 2/Sec 6):2009 been revised or superseded?");
    expect(plan.type).toBe("AMENDMENT_HISTORY");
  });

  test("classifies a laboratory question", () => {
    const plan = planQuery("Where can I find a testing laboratory for my product?");
    expect(plan.type).toBe("LABORATORY");
  });

  test("classifies a service-navigation question", () => {
    const plan = planQuery("How do I apply for a BIS licence on Manak Online?");
    expect(plan.type).toBe("SERVICE_NAVIGATION");
  });

  test("classifies an out-of-domain question and skips the LLM", () => {
    const plan = planQuery("What's the weather today?");
    expect(plan.type).toBe("OUT_OF_DOMAIN");
    expect(plan.requiresLLM).toBe(false);
    expect(plan.retrievalTasks).toEqual([]);
  });

  test("classifies an empty/near-empty query as AMBIGUOUS", () => {
    const plan = planQuery("   ");
    expect(plan.type).toBe("AMBIGUOUS");
  });

  test("never fabricates an identifier that isn't in the text", () => {
    const plan = planQuery("What standard applies to plastic water bottles?");
    expect(plan.identifiers).toEqual([]);
  });

  test("picks the smallest plan for an exact identifier even with a few trailing words", () => {
    const plan = planQuery("IS 5522:2014 scope");
    expect(plan.type).toBe("EXACT_STANDARD");
  });
});
