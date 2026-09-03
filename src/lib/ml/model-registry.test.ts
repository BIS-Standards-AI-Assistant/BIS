import { describe, test, expect, beforeEach, afterAll } from "vitest";
import { existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { registerModel, getModel, listModels, type ModelRegistryEntry } from "./model-registry";

const REGISTRY_PATH = path.join(process.cwd(), "data", "ml", "artifacts", "registry.json");
const originalContent = existsSync(REGISTRY_PATH) ? readFileSync(REGISTRY_PATH, "utf-8") : null;

function entry(overrides: Partial<ModelRegistryEntry> = {}): ModelRegistryEntry {
  return {
    modelId: "test-model",
    modelName: "Test Model",
    version: "v1",
    artifactPath: null,
    modelType: "heuristic",
    datasetVersion: null,
    metrics: {},
    createdAt: new Date().toISOString(),
    status: "EXPERIMENTAL",
    approvedBy: null,
    checksum: null,
    ...overrides,
  };
}

// Restores the real registry.json after these tests so running this
// suite never permanently mutates the committed baseline registry.
afterAll(() => {
  if (originalContent !== null) {
    writeFileSync(REGISTRY_PATH, originalContent);
  } else if (existsSync(REGISTRY_PATH)) {
    rmSync(REGISTRY_PATH);
  }
});

describe("model registry", () => {
  beforeEach(() => {
    if (existsSync(REGISTRY_PATH)) rmSync(REGISTRY_PATH);
  });

  test("registers and retrieves a model by id", () => {
    registerModel(entry());
    const found = getModel("test-model");
    expect(found?.modelName).toBe("Test Model");
  });

  test("updating the same (modelId, version) replaces the entry rather than duplicating it", () => {
    registerModel(entry({ metrics: { recall: 0.5 } }));
    registerModel(entry({ metrics: { recall: 0.9 } }));
    expect(listModels()).toHaveLength(1);
    expect(getModel("test-model")?.metrics.recall).toBe(0.9);
  });

  test("a different version of the same model is a separate entry, not an overwrite", () => {
    registerModel(entry({ version: "v1" }));
    registerModel(entry({ version: "v2" }));
    expect(listModels()).toHaveLength(2);
    expect(getModel("test-model", "v1")?.version).toBe("v1");
    expect(getModel("test-model", "v2")?.version).toBe("v2");
  });

  test("getModel prefers the PRODUCTION-status entry when multiple versions exist", () => {
    registerModel(entry({ version: "v1", status: "PRODUCTION", createdAt: "2020-01-01T00:00:00Z" }));
    registerModel(entry({ version: "v2", status: "EXPERIMENTAL", createdAt: "2026-01-01T00:00:00Z" }));
    expect(getModel("test-model")?.version).toBe("v1");
  });

  test("modelType distinguishes a heuristic from trained ML — never silently mislabeled", () => {
    registerModel(entry({ modelType: "heuristic" }));
    expect(getModel("test-model")?.modelType).toBe("heuristic");
  });

  test("getModel returns undefined for an unknown model, never a fabricated entry", () => {
    expect(getModel("does-not-exist")).toBeUndefined();
  });
});
