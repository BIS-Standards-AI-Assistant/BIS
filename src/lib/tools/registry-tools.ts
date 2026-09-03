import { z } from "zod";
import { buildReferenceEntry, type ReferenceEntry } from "../reference-registry";
import { getNeighbors, type GraphNeighbor } from "../graph/graph-retrieval";
import type { ToolDefinition, ToolResult } from "./types";

const CanonicalNumberInput = z.object({ canonicalNumber: z.string().min(1) });

/** rag.md/prompts/final.md §4 — the BIS Reference Registry, exposed as a tool. */
export const getReferenceEntryTool: ToolDefinition<z.infer<typeof CanonicalNumberInput>, ReferenceEntry> = {
  name: "getReferenceEntry",
  description: "Looks up whether a standard is known and whether its authoritative document is indexed, with access-type metadata derived only from real stored URLs.",
  inputSchema: CanonicalNumberInput,
  deterministic: true,
  async execute({ canonicalNumber }): Promise<ToolResult<ReferenceEntry>> {
    const entry = await buildReferenceEntry(canonicalNumber);
    if (!entry) return { status: "not_found" };
    return { status: "ok", data: entry, provenance: [{ source: "standards table", verificationStatus: entry.sourceVerificationStatus }] };
  },
};

const GraphNeighborsInput = z.object({ entityType: z.string().min(1), entityId: z.string().uuid() });

/** prompts/final.md §6 — graph retrieval against the real relationships table, exposed as a tool. */
export const getGraphNeighborsTool: ToolDefinition<z.infer<typeof GraphNeighborsInput>, GraphNeighbor[]> = {
  name: "getGraphNeighbors",
  description: "Finds every relationship row connected to an entity (standard, document, or QCO) in the knowledge graph.",
  inputSchema: GraphNeighborsInput,
  deterministic: true,
  async execute({ entityType, entityId }): Promise<ToolResult<GraphNeighbor[]>> {
    const neighbors = await getNeighbors(entityType, entityId);
    if (neighbors.length === 0) return { status: "not_found" };
    return {
      status: "ok",
      data: neighbors,
      provenance: neighbors.map((n) => ({ source: "relationships table", verificationStatus: n.verificationStatus })),
    };
  },
};
