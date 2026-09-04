import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQueryPipeline } from "@/lib/query-pipeline";
import { rateLimitOrNull } from "@/lib/rate-limit-http";
import type { ApplicabilityState } from "@/types/api";

/**
 * Product Analyzer (pfinal.md §8.3). Deliberately NOT a new engine — a
 * product description ("stainless steel drinking water bottle") is
 * exactly the input shape /api/v1/query's pipeline already handles
 * (query normalization -> intent -> retrieval -> grounding ->
 * applicability). Building a second, parallel engine for the same job
 * would be the "disconnected demo" this prompt explicitly warns against.
 * This route only adds the required VERIFIED/POTENTIAL/RELATED/UNKNOWN
 * labeling (§8.3) on top of the existing applicability states.
 */
const AnalyzeRequestSchema = z.object({
  productDescription: z.string().min(1).max(2000),
});

const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

const APPLICABILITY_TO_LABEL: Record<ApplicabilityState, "VERIFIED" | "POTENTIAL" | "RELATED" | "UNKNOWN"> = {
  DIRECTLY_APPLICABLE: "VERIFIED",
  POTENTIALLY_APPLICABLE: "POTENTIAL",
  RELATED: "RELATED",
  MATERIAL_MISMATCH: "RELATED",
  SCOPE_UNCLEAR: "UNKNOWN",
  INSUFFICIENT_EVIDENCE: "UNKNOWN",
  NOT_APPLICABLE: "UNKNOWN",
};

export async function POST(req: NextRequest) {
  const limited = rateLimitOrNull(req, "analyze-product", RATE_LIMIT);
  if (limited) return limited;

  const parsed = AnalyzeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runQueryPipeline(parsed.data.productDescription);

    if (!("toolEvidence" in result)) {
      // isRelevant: false branch — not a product/standards query at all.
      return NextResponse.json({ ...result, standards: [] });
    }

    // 2026-09-04 applicability-gate fix: this route built its own
    // `standards` shape from `result.recommendations` but never carried
    // recommendationStatus/primaryRecommendation through — so a
    // MATERIAL_MISMATCH candidate collapsed into the same coarse
    // "RELATED" label as a genuinely-related, non-conflicting one, and
    // nothing here told a caller "this one is gated out." The
    // authoritative gate result now passes through explicitly, same as
    // /api/v1/query's response.
    const standards = result.recommendations.map((r) => ({
      standardNumber: r.standardNumber,
      title: r.title,
      label: APPLICABILITY_TO_LABEL[r.applicability.state],
      applicabilityState: r.applicability.state,
      applicabilityReason: r.applicability.reason,
      recommendationStatus: r.recommendationStatus,
      primaryRecommendation: r.primaryRecommendation,
      groundingState: r.groundingState,
      evidenceCount: r.evidence.length,
    }));

    return NextResponse.json({
      product: result.interpretation.product,
      material: result.interpretation.material,
      intendedUse: result.interpretation.useCase,
      standards,
      possibleQco: result.toolEvidence?.results.find((r) => r.tool === "checkMandatoryStatus")?.data ?? null,
      testing: result.testing,
      certification: result.certification,
      knowledgeBoundary: result.knowledgeBoundary,
      limitations: result.limitations,
    });
  } catch (err) {
    console.error("[api/v1/analyze-product]", err);
    return NextResponse.json(
      { error: "Product analysis failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
