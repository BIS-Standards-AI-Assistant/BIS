import { registerTool, getTool, listTools, executeTool } from "./registry";
import { resolveStandardTool, getStandardTool, searchStandardsTool, findApplicableStandardsTool } from "./standards-tools";
import { checkMandatoryStatusTool, findQcoTool, getCertificationSchemeTool } from "./certification-tools";

export type { ToolDefinition, ToolResult, ToolStatus, ToolProvenance } from "./types";
export { getTool, listTools, executeTool };
export type { StandardRecord, StandardSearchHit } from "./standards-tools";
export type { QcoRecord, MandatoryStatusResult } from "./certification-tools";

/**
 * rag.md Phase 2 domain tool registry. Only tools backed by real,
 * populated data are registered (docs/INTELLIGENCE_ENGINE_AUDIT.md §6):
 * findLaboratories, findRelatedStandards, findReferencedStandards,
 * getStandardHistory, and compareStandards's relationship half are
 * deliberately NOT implemented — there is no laboratories table and the
 * `relationships` table has zero rows, so a tool there could only ever
 * return not_found or a fabricated stand-in, and rag.md §9 forbids the
 * latter.
 */
let registered = false;
export function ensureToolsRegistered(): void {
  if (registered) return;
  registered = true;
  registerTool(resolveStandardTool);
  registerTool(getStandardTool);
  registerTool(searchStandardsTool);
  registerTool(findApplicableStandardsTool);
  registerTool(checkMandatoryStatusTool);
  registerTool(findQcoTool);
  registerTool(getCertificationSchemeTool);
}

ensureToolsRegistered();
