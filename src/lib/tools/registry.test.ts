import { describe, test, expect } from "vitest";
import { z } from "zod";
import { registerTool, getTool, listTools, executeTool } from "./registry";
import type { ToolDefinition } from "./types";

// Each test file gets its own module instance in vitest, but registerTool
// throws on a duplicate name — use a fresh tool name per test to avoid
// cross-test interference within this file.
let counter = 0;
function fakeTool<Input, Output>(overrides: Partial<ToolDefinition<Input, Output>> = {}): ToolDefinition<Input, Output> {
  counter += 1;
  return {
    name: `fakeTool_${counter}`,
    description: "test tool",
    inputSchema: z.object({ value: z.string() }) as unknown as z.ZodType<Input>,
    deterministic: true,
    execute: async () => ({ status: "ok", data: { echoed: true } }) as never,
    ...overrides,
  };
}

describe("tool registry", () => {
  test("registers and retrieves a tool by name", () => {
    const tool = fakeTool();
    registerTool(tool);
    expect(getTool(tool.name)).toBe(tool);
    expect(listTools()).toContain(tool.name);
  });

  test("throws when registering a duplicate tool name", () => {
    const tool = fakeTool();
    registerTool(tool);
    expect(() => registerTool(tool)).toThrow(/already registered/);
  });

  test("executeTool returns a well-formed error for an unknown tool", async () => {
    const result = await executeTool("does-not-exist", {});
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/Unknown tool/);
  });

  test("executeTool returns a well-formed error for invalid input, never runs execute", async () => {
    let ran = false;
    const tool = fakeTool({
      execute: async () => {
        ran = true;
        return { status: "ok" };
      },
    });
    registerTool(tool);
    const result = await executeTool(tool.name, { value: 123 }); // wrong type
    expect(result.status).toBe("error");
    expect(ran).toBe(false);
  });

  test("executeTool passes through a not_found result untouched", async () => {
    const tool = fakeTool({ execute: async () => ({ status: "not_found" }) });
    registerTool(tool);
    const result = await executeTool(tool.name, { value: "x" });
    expect(result).toEqual({ status: "not_found" });
  });

  test("executeTool converts a thrown error into a status: error result", async () => {
    const tool = fakeTool({
      execute: async () => {
        throw new Error("boom");
      },
    });
    registerTool(tool);
    const result = await executeTool(tool.name, { value: "x" });
    expect(result.status).toBe("error");
    expect(result.error).toBe("boom");
  });

  test("executeTool times out a hanging tool rather than waiting forever", async () => {
    const tool = fakeTool({
      execute: () => new Promise<never>(() => {}), // never resolves
    });
    registerTool(tool);
    const result = await executeTool(tool.name, { value: "x" }, 50);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/timed out/);
  });
});
