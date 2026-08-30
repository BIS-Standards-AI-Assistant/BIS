import { executeTool, listTools } from "@/lib/tools";

/**
 * Live sanity check for the Phase 2 domain tool registry
 * (src/lib/tools/) against the real Neon database — deliberately NOT a
 * vitest unit test, since these tools query getDb() directly and this
 * project's vitest suite (npm run test:unit) is not guaranteed to run
 * with a live DATABASE_URL. Mirrors the existing eval/data scripts'
 * pattern of live-only verification. Run manually with
 * `npm run tools:smoke` before relying on these tools in an API route.
 */
async function main() {
  console.log("Registered tools:", listTools());

  const cases: Array<{ tool: string; input: unknown }> = [
    { tool: "resolveStandard", input: { query: "IS 5522:2014" } },
    { tool: "resolveStandard", input: { query: "IS 99999:2099" } }, // must be not_found, never fabricated
    { tool: "getStandard", input: { canonicalNumber: "IS 5522:2014" } },
    { tool: "getStandard", input: { canonicalNumber: "IS 99999:2099" } },
    { tool: "searchStandards", input: { query: "packaged drinking water bottle", limit: 5 } },
    { tool: "findApplicableStandards", input: { query: "electric kettle", limit: 5 } },
    { tool: "checkMandatoryStatus", input: { canonicalNumber: "IS 14543:2016" } }, // has a real QCO
    { tool: "checkMandatoryStatus", input: { canonicalNumber: "IS 5522:2014" } }, // no QCO row for this one — must not claim voluntary
    { tool: "checkMandatoryStatus", input: { canonicalNumber: "IS 99999:2099" } },
    { tool: "findQCO", input: { canonicalNumber: "IS 14543:2016" } },
    { tool: "getCertificationScheme", input: { canonicalNumber: "IS 269:2015" } },
    { tool: "unknownTool", input: {} },
    { tool: "getStandard", input: { notAField: true } }, // invalid input
  ];

  for (const { tool, input } of cases) {
    const result = await executeTool(tool, input);
    console.log(`\n[${tool}] ${JSON.stringify(input)}`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
