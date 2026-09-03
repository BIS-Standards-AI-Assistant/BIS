import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Model registry (prompts/final.md §45-46, §48-49). File-backed, not a
 * DB table — §80 explicitly says "Do not create every table
 * immediately. Implement only when required," and with zero trained
 * models to register, a `ml_models` Postgres table would be empty
 * scaffolding. This is real, working infrastructure at the scale the
 * project actually needs today; migrating to a table is a one-file
 * change once there's a second registrant that needs concurrent writes.
 *
 * ModelStatus mirrors §45's lifecycle exactly — EXPERIMENTAL through
 * RETIRED. A registry entry for a deterministic heuristic (like the
 * existing document-diversity reranker) is legitimate and expected
 * (§60's baseline-first rule requires *something* be registered as the
 * baseline every future trained model must beat) — the field that must
 * never be misrepresented is `modelType`, which distinguishes
 * "heuristic" from "trained_ml" per §3's "must not be marketed or
 * documented as trained machine learning."
 */

export type ModelStatus = "EXPERIMENTAL" | "VALIDATED" | "STAGED" | "PRODUCTION" | "RETIRED";
export type ModelType = "heuristic" | "trained_ml";

export interface ModelMetrics {
  [metricName: string]: number;
}

export interface ModelRegistryEntry {
  modelId: string;
  modelName: string;
  version: string;
  artifactPath: string | null;
  modelType: ModelType;
  datasetVersion: string | null;
  metrics: ModelMetrics;
  createdAt: string;
  status: ModelStatus;
  approvedBy: string | null;
  checksum: string | null;
}

export interface ModelHealth {
  loaded: boolean;
  version: string;
  fallbackAvailable: boolean;
}

export interface ModelMetadata {
  modelId: string;
  version: string;
  modelType: ModelType;
}

/** Every model provider (trained or heuristic) exposes this contract — prompts/final.md §49. */
export interface MLModel<TInput, TOutput> {
  predict(input: TInput): Promise<TOutput>;
  metadata(): ModelMetadata;
  health(): Promise<ModelHealth>;
}

const REGISTRY_PATH = path.join(process.cwd(), "data", "ml", "artifacts", "registry.json");

function loadRegistry(): ModelRegistryEntry[] {
  if (!existsSync(REGISTRY_PATH)) return [];
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

function saveRegistry(entries: ModelRegistryEntry[]): void {
  mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2));
}

/** Registers a new entry or updates an existing one by (modelId, version) — never silently overwrites a different version's metrics. */
export function registerModel(entry: ModelRegistryEntry): void {
  const entries = loadRegistry();
  const idx = entries.findIndex((e) => e.modelId === entry.modelId && e.version === entry.version);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  saveRegistry(entries);
}

export function getModel(modelId: string, version?: string): ModelRegistryEntry | undefined {
  const entries = loadRegistry();
  const candidates = entries.filter((e) => e.modelId === modelId);
  if (version) return candidates.find((e) => e.version === version);
  // Highest-priority production entry, else the most recently created.
  return (
    candidates.find((e) => e.status === "PRODUCTION") ??
    candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  );
}

export function listModels(): ModelRegistryEntry[] {
  return loadRegistry();
}
