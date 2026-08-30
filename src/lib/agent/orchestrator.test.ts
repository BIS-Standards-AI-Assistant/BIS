import { describe, test, expect } from "vitest";
import { runAgent } from "./orchestrator";
import type { ToolResult } from "../tools/types";

type Handler = (input: unknown) => ToolResult<unknown>;

function fakeExecutor(handlers: Record<string, Handler>) {
  return async (name: string, input: unknown): Promise<ToolResult<unknown>> => {
    const handler = handlers[name];
    if (!handler) return { status: "error", error: `no fake handler for ${name}` };
    return handler(input);
  };
}

describe("runAgent", () => {
  test("EXACT_STANDARD plan: resolves the identifier then fetches the standard in a second wave", async () => {
    const executeTool = fakeExecutor({
      resolveStandard: () => ({ status: "ok", data: [{ canonicalNumber: "IS 5522:2014" }] }),
      getStandard: (input) => {
        expect(input).toEqual({ canonicalNumber: "IS 5522:2014" });
        return { status: "ok", data: { canonicalNumber: "IS 5522:2014", title: "Stainless Steel Sheets" } };
      },
    });

    const run = await runAgent("IS 5522:2014", { executeTool });
    expect(run.plan.type).toBe("EXACT_STANDARD");
    expect(run.stopReason).toBe("required_evidence_covered");
    expect(run.resolvedStandard).toBe("IS 5522:2014");
    // Both tasks run in the same wave: the query's own identifier seeds
    // the working identifier immediately, so getStandard doesn't need to
    // wait for a separate resolveStandard round-trip to become runnable.
    expect(run.iterations).toBe(1);
    expect(run.steps.map((s) => s.tool)).toEqual(["resolveStandard", "getStandard"]);
  });

  test("QCO plan: does not call the identifier-dependent QCO tool until resolveStandard succeeds", async () => {
    const calledBeforeResolve: string[] = [];
    const executeTool = fakeExecutor({
      resolveStandard: () => ({ status: "ok", data: [{ canonicalNumber: "IS 15410:2003" }] }),
      checkMandatoryStatus: (input) => {
        calledBeforeResolve.push(JSON.stringify(input));
        return { status: "ok", data: { standardNumber: "IS 15410:2003", hasVerifiedQco: false, qcos: [] } };
      },
      findQCO: () => ({ status: "not_found" }),
    });

    const run = await runAgent("Is IS 15410:2003 mandatory under a QCO?", { executeTool });
    expect(run.plan.type).toBe("QCO");
    expect(calledBeforeResolve).toEqual([JSON.stringify({ canonicalNumber: "IS 15410:2003" })]);
    expect(run.stopReason).toBe("required_evidence_covered");
  });

  test("stops with no_useful_new_evidence when a fabricated identifier resolves to nothing, never reporting it as resolved", async () => {
    const executeTool = fakeExecutor({
      resolveStandard: () => ({ status: "not_found" }),
      getStandard: () => ({ status: "not_found" }),
    });

    const run = await runAgent("IS 99999:2099", { executeTool });
    // The regex resolver parses "IS 99999:2099" as a syntactically valid
    // identifier and seeds it as a working candidate so identifier-
    // dependent tools can attempt it — but since every confirming tool
    // call comes back not_found, it must never be reported as resolved.
    expect(run.resolvedStandard).toBeNull();
    expect(run.stopReason).toBe("no_useful_new_evidence");
    expect(run.steps.map((s) => s.tool)).toEqual(["resolveStandard", "getStandard"]);
  });

  test("never exceeds MAX_ITERATIONS even if evidence keeps being incomplete", async () => {
    const executeTool = fakeExecutor({
      resolveStandard: () => ({ status: "ok", data: [{ canonicalNumber: "IS 1:2000" }] }),
      getStandard: () => ({ status: "ok", data: { canonicalNumber: "IS 1:2000" } }),
    });

    const run = await runAgent("IS 1:2000", { executeTool });
    expect(run.iterations).toBeLessThanOrEqual(3);
  });

  test("reports unimplemented planned tools as skippedTasks rather than fabricating a result", async () => {
    const executeTool = fakeExecutor({
      resolveStandard: () => ({ status: "ok", data: [{ canonicalNumber: "IS 302 (Part 2/Sec 6):2009" }] }),
    });

    const run = await runAgent("Has IS 302 (Part 2/Sec 6):2009 been revised or superseded?", { executeTool });
    expect(run.plan.type).toBe("AMENDMENT_HISTORY");
    // getStandardHistory is in the plan's retrievalTasks but has no
    // registered tool implementation yet.
    expect(run.skippedTasks).toContain("getStandardHistory");
  });

  test("OUT_OF_DOMAIN / empty plans stop immediately with no_tools_for_plan, calling nothing", async () => {
    const calls: string[] = [];
    const executeTool = fakeExecutor({});
    const wrapped = async (name: string, input: unknown) => {
      calls.push(name);
      return executeTool(name, input);
    };

    const run = await runAgent("What's the weather today?", { executeTool: wrapped });
    expect(run.stopReason).toBe("no_tools_for_plan");
    expect(calls).toEqual([]);
  });

  test("CERTIFICATION plan seeds the candidate standard from the query's own identifier, not a fuzzy search top-hit", async () => {
    // Regression: CERTIFICATION plans don't include resolveStandard in
    // their retrievalTasks, so before the fix, findApplicableStandards'
    // fuzzy top hit (a different, unrelated standard) silently became
    // the "resolved" standard even though the query named one exactly.
    const executeTool = fakeExecutor({
      findApplicableStandards: () => ({
        status: "ok",
        data: [{ standardNumber: "IS 14543:2016", title: "unrelated fuzzy match", score: 0.5, chunkCount: 1 }],
      }),
      getCertificationScheme: (input) => {
        expect(input).toEqual({ canonicalNumber: "IS 269:2015" });
        return { status: "ok", data: { standardNumber: "IS 269:2015" } };
      },
      checkMandatoryStatus: (input) => {
        expect(input).toEqual({ canonicalNumber: "IS 269:2015" });
        return { status: "ok", data: { standardNumber: "IS 269:2015", hasVerifiedQco: true, qcos: [] } };
      },
    });

    const run = await runAgent("What certification scheme applies to IS 269:2015?", { executeTool });
    expect(run.plan.type).toBe("CERTIFICATION");
    expect(run.resolvedStandard).toBe("IS 269:2015");
  });

  test("COMPARISON plan: resolves identifiers but skips the unimplemented compareStandards tool", async () => {
    const executeTool = fakeExecutor({
      resolveStandard: () => ({ status: "ok", data: [{ canonicalNumber: "IS 5522:2014" }] }),
    });

    const run = await runAgent("IS 5522:2014 vs IS 14756:2017", { executeTool });
    expect(run.plan.type).toBe("COMPARISON");
    expect(run.skippedTasks).toContain("compareStandards");
    expect(run.stopReason).toBe("required_evidence_covered");
  });
});
