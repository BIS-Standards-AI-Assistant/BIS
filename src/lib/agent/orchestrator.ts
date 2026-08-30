import { planQuery, type QueryPlan } from "../query-planner";
import { executeTool as defaultExecuteTool, listTools, ensureToolsRegistered } from "../tools";
import type { ToolResult } from "../tools/types";

/**
 * Single bounded BIS orchestrator (rag.md Phase 7-8). Deliberately NOT an
 * LLM-driven agent: tool selection comes entirely from the deterministic
 * query planner (src/lib/query-planner.ts), never from a model choosing
 * what to call. This keeps the orchestrator itself inside the spec's
 * core rule (§1: the LLM must not be the source of truth) without
 * needing a separate validation layer to police an LLM's tool picks —
 * there simply isn't an LLM in this loop yet. If a future phase adds
 * LLM-suggested tool calls, they must be validated against `listTools()`
 * and the plan's allowed task set the same way rag.md §22 requires,
 * not bolted on as a trusted shortcut.
 */

export interface AgentStep {
  tool: string;
  input: unknown;
  result: ToolResult<unknown>;
}

export type StopReason =
  | "required_evidence_covered"
  | "max_iterations"
  | "no_useful_new_evidence"
  | "no_tools_for_plan";

export interface AgentRunResult {
  plan: QueryPlan;
  steps: AgentStep[];
  /** Planned tasks whose tool isn't implemented yet (rag.md §9: never fabricate a result for a missing capability — report the gap instead). */
  skippedTasks: string[];
  iterations: number;
  stopReason: StopReason;
  /** The standard identifier the loop resolved, if any — later iterations' identifier-dependent tools ran against this. */
  resolvedStandard: string | null;
}

const MAX_ITERATIONS = 3;

// Tools that need a resolved standard identifier before they can run at
// all — held back until an earlier iteration (or the query itself)
// produces one, mirroring rag.md §20's worked example (retrieve
// standards first, only then retrieve certification/testing evidence
// for that standard).
const IDENTIFIER_DEPENDENT_TOOLS = new Set(["getStandard", "checkMandatoryStatus", "findQCO", "getCertificationScheme"]);

// Tools whose "ok" result means the identifier was actually confirmed to
// exist (each one looks the identifier up against a real table/dataset
// and returns not_found otherwise) — distinct from searchStandards /
// findApplicableStandards, whose "ok" result is only a fuzzy discovery
// hit and must never be reported as a confirmed resolution.
const CONFIRMING_TOOLS = new Set(["resolveStandard", "getStandard", "checkMandatoryStatus", "findQCO", "getCertificationScheme"]);

type ExecuteToolFn = (name: string, input: unknown) => Promise<ToolResult<unknown>>;

function buildInput(task: string, query: string, candidateStandard: string | null, identifiers: string[]): unknown | null {
  switch (task) {
    case "resolveStandard":
    case "searchStandards":
    case "findApplicableStandards":
      return { query, limit: 5 };
    case "getStandard":
    case "checkMandatoryStatus":
    case "findQCO":
    case "getCertificationScheme":
      return candidateStandard ? { canonicalNumber: candidateStandard } : null;
    case "compareStandards":
      // Uses the two identifiers the planner already parsed from the
      // query text directly — planQuery only assigns the COMPARISON
      // plan type when identifiers.length >= 2, so this is always
      // available whenever this task is actually in a real plan.
      return identifiers.length >= 2 ? { canonicalNumberA: identifiers[0], canonicalNumberB: identifiers[1] } : null;
    default:
      return null;
  }
}

/** Pulls a standard identifier out of whichever tool first found one — never invents one from a null field. */
function extractStandardNumber(tool: string, result: ToolResult<unknown>): string | null {
  if (result.status !== "ok" || !result.data) return null;
  if (tool === "resolveStandard") {
    const data = result.data as Array<{ canonicalNumber: string }>;
    return data[0]?.canonicalNumber ?? null;
  }
  if (tool === "searchStandards" || tool === "findApplicableStandards") {
    const data = result.data as Array<{ standardNumber: string | null }>;
    return data.find((d) => d.standardNumber)?.standardNumber ?? null;
  }
  if (tool === "getStandard") {
    const data = result.data as { canonicalNumber: string };
    return data.canonicalNumber;
  }
  return null;
}

/**
 * Runs the planned retrieval tasks in bounded waves (rag.md §20-21):
 * identifier-independent tasks first, then identifier-dependent tasks
 * once a candidate standard is known, stopping as soon as every runnable
 * task has been attempted, no iteration makes further progress, or
 * MAX_ITERATIONS is reached — never an unbounded loop.
 */
export async function runAgent(
  query: string,
  deps: { executeTool?: ExecuteToolFn } = {},
): Promise<AgentRunResult> {
  ensureToolsRegistered();
  const exec = deps.executeTool ?? defaultExecuteTool;
  const plan = planQuery(query);
  const steps: AgentStep[] = [];

  const implemented = new Set(listTools());
  const skippedTasks = plan.retrievalTasks.filter((t) => !implemented.has(t));
  const pending = new Set(plan.retrievalTasks.filter((t) => implemented.has(t)));

  if (plan.retrievalTasks.length === 0 || pending.size === 0) {
    return {
      plan,
      steps,
      skippedTasks,
      iterations: 0,
      stopReason: "no_tools_for_plan",
      resolvedStandard: null,
    };
  }

  // Seed the WORKING identifier from the plan's own deterministically-
  // parsed identifiers (src/lib/standards-id.ts), before any tool runs.
  // Found necessary live: a CERTIFICATION-type plan's retrievalTasks
  // don't include resolveStandard at all (retrievalTasksFor's
  // CERTIFICATION case), so a query like "What certification scheme
  // applies to IS 269:2015?" would otherwise let findApplicableStandards'
  // fuzzy top hit silently override the identifier the user actually
  // typed. This is only a WORKING value used to build tool inputs — it
  // is not reported as `resolvedStandard` until a confirming tool
  // actually validates it against real data (see CONFIRMING_TOOLS
  // above), so a fabricated/nonexistent identifier the user typed is
  // still correctly reported as unresolved, never as "resolved."
  let workingIdentifier: string | null = plan.identifiers[0] ?? null;
  let resolvedStandard: string | null = null;
  let iterations = 0;

  for (iterations = 1; iterations <= MAX_ITERATIONS; iterations++) {
    const runnableNow = [...pending].filter((task) => !IDENTIFIER_DEPENDENT_TOOLS.has(task) || workingIdentifier);
    if (runnableNow.length === 0) break; // everything left needs an identifier we don't have and won't get

    let madeProgress = false;
    for (const task of runnableNow) {
      pending.delete(task);
      const input = buildInput(task, query, workingIdentifier, plan.identifiers);
      if (input === null) continue;

      const result = await exec(task, input);
      steps.push({ tool: task, input, result });

      if (result.status === "ok") {
        madeProgress = true;
        if (!workingIdentifier) workingIdentifier = extractStandardNumber(task, result);
        if (CONFIRMING_TOOLS.has(task)) resolvedStandard = workingIdentifier ?? extractStandardNumber(task, result);
      }
    }

    // Check madeProgress before pending.size: if this wave attempted
    // every remaining task and NONE of them succeeded, that is a total
    // failure, not "required evidence covered" — e.g. a fabricated
    // identifier where every identifier-dependent tool correctly
    // returns not_found. Reporting that as covered would misrepresent
    // an empty result as a completed, successful lookup.
    if (!madeProgress) {
      return { plan, steps, skippedTasks, iterations, stopReason: "no_useful_new_evidence", resolvedStandard };
    }
    if (pending.size === 0) {
      return { plan, steps, skippedTasks, iterations, stopReason: "required_evidence_covered", resolvedStandard };
    }
  }

  return {
    plan,
    steps,
    skippedTasks,
    iterations: MAX_ITERATIONS,
    stopReason: pending.size === 0 ? "required_evidence_covered" : "max_iterations",
    resolvedStandard,
  };
}
