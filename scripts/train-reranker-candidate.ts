/**
 * Trains a minimal candidate reranker over data/ml/datasets/query_document_relevance.jsonl
 * and evaluates it with leave-one-query-out cross-validation — honestly, on
 * 65 real examples across ~20 distinct queries, which is nowhere near the
 * project's own 300+ threshold (data/ml/README.md). This is registered as
 * a CANDIDATE, never PRODUCTION, and is NOT wired into
 * src/lib/ml/reranker.ts's live path. Its only job is to answer one
 * question honestly: does the current tiny dataset show any signal at all
 * beyond the deterministic heuristic already in production?
 *
 * Usage: npx tsx scripts/train-reranker-candidate.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Row {
  query: string;
  candidate_standard: string;
  candidate_title: string;
  label: number;
}

const STOP_WORDS = new Set(["the", "a", "an", "for", "of", "to", "is", "are", "in", "on", "and", "or", "what", "which", "how", "does", "do", "i", "want", "under"]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

function normalizeId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** [exactIdMatch, titleOverlapRatio] — 2 simple, inspectable features. */
function features(r: Row): [number, number] {
  const exactId = normalizeId(r.query).includes(normalizeId(r.candidate_standard).replace(/^is/, "")) ? 1 : 0;
  const qTok = tokens(r.query);
  const tTok = tokens(r.candidate_title);
  const overlap = [...qTok].filter((t) => tTok.has(t)).length;
  const ratio = tTok.size > 0 ? overlap / tTok.size : 0;
  return [exactId, ratio];
}

function trainLinear(rows: Row[]): { w: number[]; b: number } {
  // Least-squares via simple gradient descent — 2 features, no dependency needed.
  const w = [0, 0];
  let b = 0;
  const lr = 0.3;
  const X = rows.map(features);
  const y = rows.map((r) => r.label);
  for (let epoch = 0; epoch < 2000; epoch++) {
    const gw = [0, 0];
    let gb = 0;
    for (let i = 0; i < X.length; i++) {
      const pred = w[0] * X[i][0] + w[1] * X[i][1] + b;
      const err = pred - y[i];
      gw[0] += err * X[i][0];
      gw[1] += err * X[i][1];
      gb += err;
    }
    const n = X.length;
    w[0] -= (lr * gw[0]) / n;
    w[1] -= (lr * gw[1]) / n;
    b -= (lr * gb) / n;
  }
  return { w, b };
}

function predict(model: { w: number[]; b: number }, r: Row): number {
  const [f0, f1] = features(r);
  return model.w[0] * f0 + model.w[1] * f1 + model.b;
}

function main() {
  const dsPath = path.join(__dirname, "..", "data", "ml", "datasets", "query_document_relevance.jsonl");
  const rows: Row[] = readFileSync(dsPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

  console.log(`Loaded ${rows.length} labeled rows across ${new Set(rows.map((r) => r.query)).size} distinct queries.\n`);

  // Leave-one-query-out CV: for each query, does the trained score rank its
  // own true-positive candidate(s) above its own distractors? This is the
  // same question the existing heuristic's Recall@K answers, so it's a
  // fair, comparable metric.
  const byQuery = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byQuery.has(r.query)) byQuery.set(r.query, []);
    byQuery.get(r.query)!.push(r);
  }

  let correctTop = 0;
  let totalQueries = 0;
  for (const [query, group] of byQuery) {
    if (group.length < 2) continue; // nothing to rank against
    const trainRows = rows.filter((r) => r.query !== query);
    const model = trainLinear(trainRows);
    const scored = group.map((r) => ({ r, score: predict(model, r) }));
    scored.sort((a, b) => b.score - a.score);
    totalQueries++;
    if (scored[0].r.label === Math.max(...group.map((g) => g.label))) correctTop++;
  }

  const heuristicBaselineRecall = 1.0; // data/ml/artifacts/registry.json's document-diversity-v1, recallAt5 = 1.0
  console.log(`Leave-one-query-out top-1 accuracy: ${correctTop}/${totalQueries} (${((correctTop / totalQueries) * 100).toFixed(1)}%)`);
  console.log(`Existing production heuristic (document-diversity-v1) recall@5 on its own 20-query golden set: ${(heuristicBaselineRecall * 100).toFixed(1)}%`);
  console.log(
    `\nHonest read: ${totalQueries} held-out queries is too small to claim this beats or loses to the heuristic. ` +
      `Registering as CANDIDATE, not PRODUCTION — see data/ml/artifacts/registry.json.`,
  );

  const finalModel = trainLinear(rows);
  const registryPath = path.join(__dirname, "..", "data", "ml", "artifacts", "registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  registry.push({
    modelId: "linear-reranker-candidate-v1",
    modelName: "2-feature linear reranker (exact-ID match, title token overlap)",
    version: "v1",
    artifactPath: null,
    modelType: "trained_ml",
    datasetVersion: `query_document_relevance-${rows.length}rows`,
    metrics: {
      leaveOneQueryOutTop1Accuracy: totalQueries > 0 ? correctTop / totalQueries : null,
      trainingRows: rows.length,
      distinctQueries: byQuery.size,
    },
    createdAt: new Date().toISOString(),
    status: "CANDIDATE",
    approvedBy: null,
    checksum: null,
    notes: `Trained on ${rows.length} rows (65 from a 2026-09-16 rapid-review session, 1 pre-existing) — far below the project's 300+ threshold for a meaningful reranker. Not wired into src/lib/ml/reranker.ts. Weights: exactIdMatch=${finalModel.w[0].toFixed(3)}, titleOverlapRatio=${finalModel.w[1].toFixed(3)}, bias=${finalModel.b.toFixed(3)}.`,
  });
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  console.log(`\nRegistered as CANDIDATE in ${registryPath}.`);
}

main();
