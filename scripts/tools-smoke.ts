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
    // same base standard (IS 302), different part/section — sameBaseStandard must be true
    { tool: "compareStandards", input: { canonicalNumberA: "IS 302 (Part 2/Sec 6):2009", canonicalNumberB: "IS 302 (Part 2/Sec 3):2007" } },
    // two unrelated standards, both with ingested evidence — real term overlap only
    { tool: "compareStandards", input: { canonicalNumberA: "IS 5522:2014", canonicalNumberB: "IS 14543:2016" } },
    // one side has no ingested document — must report insufficient evidence, not fabricate overlap
    { tool: "compareStandards", input: { canonicalNumberA: "IS 5522:2014", canonicalNumberB: "IS 269:2015" } },
    { tool: "compareStandards", input: { canonicalNumberA: "IS 5522:2014", canonicalNumberB: "IS 99999:2099" } },
    { tool: "getReferenceEntry", input: { canonicalNumber: "IS 5522:2014" } }, // has a real ingested document -> indexedByNavigator true
    { tool: "getReferenceEntry", input: { canonicalNumber: "IS 269:2015" } }, // no ingested document -> indexedByNavigator false, notes explain why
    { tool: "getReferenceEntry", input: { canonicalNumber: "IS 99999:2099" } }, // must be not_found, never a fabricated entry
    // IS 5522:2014's real standards.id, from earlier live queries this session
    { tool: "getGraphNeighbors", input: { entityType: "standard", entityId: "dabdadf1-1895-4825-9d6a-fa5b7bf21ad2" } },
    { tool: "getGraphNeighbors", input: { entityType: "standard", entityId: "00000000-0000-0000-0000-000000000000" } }, // no relationships -> not_found
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
