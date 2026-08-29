/**
 * Phase 7 — confidence calibration scaffolding.
 *
 * Compares engine-predicted confidence against actual correctness using
 * data/evaluation/golden-queries.json + data/evaluation/validation-results.json
 * (produced by scripts/validate-generation.ts). This does NOT call an LLM
 * or hit the database — it's pure analysis over already-collected results.
 *
 * Honesty requirement from the milestone brief: if there isn't enough
 * labeled data for a statistically meaningful calibration, this script
 * says so explicitly rather than reporting a number that looks precise but
 * isn't backed by enough samples.
 *
 * Usage: npx tsx scripts/calibrate-confidence.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

interface ValidationRow {
  id: string;
  ran: boolean;
  standardCorrect: boolean | null;
  groundingCorrect: boolean | null;
  confidenceCorrect: boolean | null;
  falseStandardDetected: boolean;
  failureMode: string;
}

// Below this sample size, confidence-band accuracy/precision/recall numbers
// are too noisy to act on — a single flipped case would swing the reported
// rate by double digits. This isn't a statistical rule with a citation
// behind it; it's a floor chosen so we never report, say, "100% precision"
// off of 2 samples.
const MIN_SAMPLES_FOR_CALIBRATION = 20;

function main() {
  const resultsPath = path.join(__dirname, "..", "data", "evaluation", "validation-results.json");
  if (!existsSync(resultsPath)) {
    console.log("calibration data insufficient: data/evaluation/validation-results.json does not exist yet.");
    console.log("Run scripts/eval-generation.ts then scripts/validate-generation.ts first.");
    process.exit(0);
  }

  const rows: ValidationRow[] = JSON.parse(readFileSync(resultsPath, "utf-8"));
  const ran = rows.filter((r) => r.ran);

  console.log(`Validation rows available: ${rows.length} total, ${ran.length} actually ran.\n`);

  if (ran.length < MIN_SAMPLES_FOR_CALIBRATION) {
    console.log(
      `calibration data insufficient: only ${ran.length} query result(s) with a real generation run ` +
        `(need at least ${MIN_SAMPLES_FOR_CALIBRATION} for a confidence-band accuracy/precision/recall figure ` +
        `to mean anything). This is expected — OpenRouter credit exhaustion has blocked most of the golden ` +
        `set from running end-to-end this session (see data/evaluation/GENERATION_BASELINE.md).`,
    );
    console.log("\nWhat CAN be reported honestly from what ran:");
    for (const r of ran) {
      console.log(
        `  ${r.id}: standardCorrect=${r.standardCorrect ?? "n/a"} groundingCorrect=${r.groundingCorrect ?? "n/a"} ` +
          `confidenceCorrect=${r.confidenceCorrect ?? "n/a"} failureMode=${r.failureMode}`,
      );
    }
    process.exit(0);
  }

  // This branch is intentionally unreached until enough golden-query runs
  // exist — left implemented (not stubbed) so calibration can run
  // immediately once the sample size is met, without another
  // implementation pass.
  const correct = ran.filter((r) => r.standardCorrect !== false && r.groundingCorrect !== false && r.confidenceCorrect !== false);
  const accuracy = correct.length / ran.length;
  const falsePositives = ran.filter((r) => r.falseStandardDetected).length;

  console.log(`Overall accuracy (standard + grounding + confidence all correct): ${(accuracy * 100).toFixed(1)}%`);
  console.log(`False-standard rate: ${falsePositives}/${ran.length}`);
  console.log(
    "\nNote: this is accuracy against the golden set's own expectations, not a calibration curve " +
      "(predicted confidence vs. observed correctness rate per band). A true calibration curve needs " +
      "confidence-band-level bucketing, which needs more than one query per band to be meaningful — " +
      "revisit this once the full 20-query set (or a larger one) has run end-to-end.",
  );
}

main();
