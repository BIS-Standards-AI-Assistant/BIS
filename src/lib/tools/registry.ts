import type { ToolDefinition, ToolResult } from "./types";

/**
 * Central registry (rag.md §7, §22). An agent/orchestrator only ever gets
 * a tool by name through this module — it never calls a tool's
 * `execute` directly — so argument validation and the timeout guard
 * below apply uniformly no matter what calls a tool.
 */

const TOOL_TIMEOUT_MS = 8000;

const registry = new Map<string, ToolDefinition<unknown, unknown>>();

export function registerTool<Input, Output>(tool: ToolDefinition<Input, Output>): void {
  if (registry.has(tool.name)) {
    throw new Error(`Tool "${tool.name}" is already registered`);
  }
  registry.set(tool.name, tool as ToolDefinition<unknown, unknown>);
}

export function getTool(name: string): ToolDefinition<unknown, unknown> | undefined {
  return registry.get(name);
}

export function listTools(): string[] {
  return [...registry.keys()];
}

function withTimeout<T>(promise: Promise<T>, ms: number, toolName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/**
 * Runs a registered tool by name with schema-validated input (rag.md
 * §22: "tool exists, arguments are valid"). Never throws — a missing
 * tool, an invalid argument, a timeout, or an execution error all become
 * a `{status: "error"}` result so a caller (agent loop or API route)
 * always gets a well-formed ToolResult back.
 */
export async function executeTool(
  name: string,
  rawInput: unknown,
  timeoutMs: number = TOOL_TIMEOUT_MS,
): Promise<ToolResult<unknown>> {
  const tool = getTool(name);
  if (!tool) {
    return { status: "error", error: `Unknown tool: "${name}"` };
  }

  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "error", error: `Invalid input for tool "${name}": ${parsed.error.message}` };
  }

  try {
    return await withTimeout(tool.execute(parsed.data), timeoutMs, name);
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}
