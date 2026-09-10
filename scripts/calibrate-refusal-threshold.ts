/**
 * PRD §8.1 — "Setting the Refusal Threshold (Practical Method)".
 *
 * The PRD prescribes a manual, eyeball calibration rather than a fitted
 * statistic: run a handful of queries the corpus genuinely covers, run a
 * handful it genuinely does not, look at the gap between the two groups'
 * top-1 retrieval scores, and put the floor in that gap.
 *
 * The PRD's suggested 0.55 starting point explicitly does NOT apply here,
 * and the PRD says so itself: "If a different embedding model or a
 * non-cosine similarity metric was used, the 0.55 starting point does not
 * apply; scores must be re-checked against that model's actual output
 * range." This project uses pgvector + its own embedding model, so this
 * script measures the real range instead of assuming one.
 *
 * What it measures: the highest raw cosine similarity
 * (RetrievedChunk.semanticSimilarity, i.e. 1 - cosine distance) across the
 * whole retrieved set for each query — NOT the reranked rank-1 position's
 * score, and NOT an average across all k. Rationale: `score`/`fusedScore`
 * are rank reciprocals, so the nearest neighbour in a small corpus scores
 * near the maximum however irrelevant it is (this is the exact defect
 * already documented in src/lib/grounding.ts). Cosine similarity is the
 * only field in the pipeline that carries an absolute relevance magnitude.
 * Taking the max across the set rather than position 1 means the floor
 * asks "is ANYTHING retrieved actually relevant?", so a reranker reshuffle
 * can never on its own trigger a refusal.
 *
 * Usage:  npm run eval:refusal-threshold
 * Writes: data/evaluation/refusal-calibration.json (real measured numbers)
 *
 * Requires DATABASE_URL — the seed-corpus fallback path has no embeddings
 * and therefore no similarity to calibrate against.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { retrieveChunks } from "@/lib/retrieval";

interface CalibrationQuery {
  id: string;
  query: string;
  coveredBy?: string;
  why?: string;
}

interface Measurement {
  id: string;
  query: string;
  topSimilarity: number | null;
  rank1Similarity: number | null;
  topStandardNumber: string | null;
  chunkCount: number;
}

const RETRIEVAL_LIMIT = 12;

async function measure(q: CalibrationQuery): Promise<Measurement> {
  const chunks = await retrieveChunks(q.query, { limit: RETRIEVAL_LIMIT });
  const sims = chunks
    .map((c) => c.semanticSimilarity)
    .filter((s): s is number => s !== null);
  return {
    id: q.id,
    query: q.query,
    topSimilarity: sims.length > 0 ? Math.max(...sims) : null,
    rank1Similarity: chunks[0]?.semanticSimilarity ?? null,
    topStandardNumber: chunks[0]?.standardNumber ?? null,
    chunkCount: chunks.length,
  };
}

function fmt(n: number | null): string {
  return n === null ? "  (none)" : n.toFixed(4);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. This calibration needs the live pgvector index —\n" +
        "the local seed fallback has no embeddings, so there is no similarity to measure.",
    );
    process.exit(1);
  }

  const setPath = path.join(__dirname, "..", "data", "evaluation", "refusal-calibration-queries.json");
  const set = JSON.parse(readFileSync(setPath, "utf-8")) as {
    inCorpus: CalibrationQuery[];
    outOfCorpus: CalibrationQuery[];
  };

  console.log("PRD §8.1 refusal-threshold calibration");
  console.log("Metric: max pgvector cosine similarity across the retrieved set\n");

  const inCorpus: Measurement[] = [];
  console.log("IN-CORPUS (queries the indexed documents genuinely cover)");
  for (const q of set.inCorpus) {
    const m = await measure(q);
    inCorpus.push(m);
    console.log(`  ${m.id}  top=${fmt(m.topSimilarity)}  rank1=${fmt(m.rank1Similarity)}  ${m.topStandardNumber ?? "-"}  "${m.query.slice(0, 52)}"`);
  }

  const outOfCorpus: Measurement[] = [];
  console.log("\nOUT-OF-CORPUS (queries nothing indexed covers)");
  for (const q of set.outOfCorpus) {
    const m = await measure(q);
    outOfCorpus.push(m);
    console.log(`  ${m.id}  top=${fmt(m.topSimilarity)}  rank1=${fmt(m.rank1Similarity)}  ${m.topStandardNumber ?? "-"}  "${m.query.slice(0, 52)}"`);
  }

  const inSims = inCorpus.map((m) => m.topSimilarity).filter((s): s is number => s !== null);
  const outSims = outOfCorpus.map((m) => m.topSimilarity).filter((s): s is number => s !== null);

  if (inSims.length === 0 || outSims.length === 0) {
    console.error("\nNot enough measured similarities to calibrate. Is the corpus ingested?");
    process.exit(1);
  }

  const inMin = Math.min(...inSims);
  const inMax = Math.max(...inSims);
  const outMin = Math.min(...outSims);
  const outMax = Math.max(...outSims);
  const separated = inMin > outMax;
  // The floor goes in the gap. When the groups are cleanly separated, put
  // it at the midpoint; when they overlap there is no honest single cutoff
  // and the script says so rather than inventing one.
  const suggested = separated ? (inMin + outMax) / 2 : null;

  console.log("\n--- Summary ---");
  console.log(`  in-corpus      min=${inMin.toFixed(4)}  max=${inMax.toFixed(4)}  (n=${inSims.length})`);
  console.log(`  out-of-corpus  min=${outMin.toFixed(4)}  max=${outMax.toFixed(4)}  (n=${outSims.length})`);
  console.log(`  separated: ${separated ? "YES" : "NO — the groups overlap"}`);
  if (separated) {
    console.log(`  gap: ${outMax.toFixed(4)} .. ${inMin.toFixed(4)}  (width ${(inMin - outMax).toFixed(4)})`);
    console.log(`  suggested floor (gap midpoint): ${suggested!.toFixed(4)}`);
  } else {
    console.log("  No single cutoff separates these groups. Do NOT invent one —");
    console.log("  either the corpus is too small or the out-of-corpus set is too close to it.");
  }

  const out = {
    generatedAt: new Date().toISOString(),
    metric: "max pgvector cosine similarity (1 - cosine distance) across the retrieved set",
    retrievalLimit: RETRIEVAL_LIMIT,
    note:
      "Measured live against the ingested corpus. These are real observed numbers, " +
      "not projections. Re-run after any change to the embedding model, the corpus, " +
      "or the retrieval query — the floor in src/lib/relevance-floor.ts is only valid " +
      "for the configuration recorded here.",
    inCorpus,
    outOfCorpus,
    summary: { inMin, inMax, outMin, outMax, separated, suggestedFloor: suggested },
  };
  const outPath = path.join(__dirname, "..", "data", "evaluation", "refusal-calibration.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
