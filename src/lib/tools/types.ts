import type { z } from "zod";

/**
 * Tool contract (prompts/rag.md §8-9). Every tool declares its own input
 * schema so the registry can validate arguments before running anything —
 * "the system validates: tool exists, arguments are valid" (§22) — and
 * every tool call resolves to one of exactly three outcomes: `ok` (with
 * data), `not_found` (nothing fabricated to fill the gap), or `error`
 * (the tool itself failed, e.g. a DB timeout). There is no fourth outcome
 * where a tool guesses.
 */

export type ToolStatus = "ok" | "not_found" | "error";

export interface ToolResult<Output> {
  status: ToolStatus;
  data?: Output;
  /** Present on "ok" and "not_found" (which source, and how verified) — never present as a fabricated placeholder on "error". */
  provenance?: ToolProvenance[];
  error?: string;
}

export interface ToolProvenance {
  source: string; // e.g. "standards" table, "qcos" table, or a specific sourceUrl
  verificationStatus?: string;
}

export interface ToolDefinition<Input, Output> {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  /**
   * Every tool implemented so far is deterministic (a DB read or the
   * existing hybrid-retrieval pipeline, never an LLM call deciding the
   * result) — see rag.md §7 "tools should be deterministic whenever
   * possible." This field exists so a future non-deterministic tool
   * (e.g. one that calls an LLM) is a visible, explicit exception rather
   * than an unstated assumption.
   */
  deterministic: boolean;
  execute: (input: Input) => Promise<ToolResult<Output>>;
}
