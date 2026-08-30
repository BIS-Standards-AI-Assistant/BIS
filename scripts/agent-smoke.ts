import { runAgent } from "@/lib/agent/orchestrator";

/**
 * Live sanity check for the bounded agent orchestrator
 * (src/lib/agent/orchestrator.ts) against the real Neon database and the
 * real tool registry — not a vitest unit test, same reasoning as
 * scripts/tools-smoke.ts. Run manually with `npm run agent:smoke`.
 */
async function main() {
  const queries = [
    "IS 5522:2014",
    "Is IS 14543:2016 mandatory under a QCO?",
    "What certification scheme applies to IS 269:2015?",
    "IS 99999:2099", // fabricated identifier — must never resolve to a fake standard
    "What's the weather today?", // out of domain — must call no tools at all
    "Which BIS standard applies to stainless steel bottles?", // product discovery, no identifier
  ];

  for (const query of queries) {
    const run = await runAgent(query);
    console.log(`\n=== "${query}" ===`);
    console.log("plan:", run.plan.type, run.plan.complexity);
    console.log("stopReason:", run.stopReason, "| iterations:", run.iterations, "| resolvedStandard:", run.resolvedStandard);
    console.log("skippedTasks:", run.skippedTasks);
    console.log("steps:", run.steps.map((s) => ({ tool: s.tool, status: s.result.status })));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
