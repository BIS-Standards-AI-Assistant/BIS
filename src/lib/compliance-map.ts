import type { ComplianceMap, Recommendation } from "@/types/api";
import { findCertificationSchemeForStandard } from "@/lib/certification-schemes";

/**
 * Builds the compliance map from the fact-checked certification reference
 * dataset only.
 *
 * This function previously fabricated its entire output: it attached a
 * hardcoded "ISI Mark Scheme (Scheme-I)" / "Mandatory (QCO Active)" row to
 * every result regardless of whether any QCO existed, invented two test
 * names against invented clause numbers, and generated laboratory
 * coordinates with `Math.random()` — all rendered to the user as fact,
 * in direct violation of the project's "no invented certification routes,
 * testing requirements, or clauses" rule. It now reads real entries or
 * returns nothing.
 *
 * Matching is by exact standard number INCLUDING the edition year, via the
 * shared `findCertificationSchemeForStandard` (the same matcher the
 * Standard Passport uses) — a different edition can carry different
 * certification requirements, so a near-miss is reported as unmatched
 * rather than resolved to the closest edition.
 */
export async function buildComplianceMap(recommendations: Recommendation[]): Promise<ComplianceMap> {
  const primary = recommendations.filter((r) => r.primaryRecommendation);

  const map: ComplianceMap = {
    standards: primary.map((r) => ({
      standardNumber: r.standardNumber || "Unknown",
      title: r.title,
      confidence:
        r.groundingState === "verified" ? "high" : r.groundingState === "supported_inference" ? "medium" : "low",
      documentId: r.evidence[0]?.documentId,
    })),
    certifications: [],
    testing: [],
    unmatchedStandards: [],
  };

  for (const rec of primary) {
    if (!rec.standardNumber) continue;
    let scheme: Awaited<ReturnType<typeof findCertificationSchemeForStandard>> = null;
    try {
      scheme = await findCertificationSchemeForStandard(rec.standardNumber);
    } catch (err) {
      console.error("[query-pipeline] certification reference lookup failed", err);
    }

    if (!scheme) {
      map.unmatchedStandards.push(rec.standardNumber);
      continue;
    }

    if (scheme.scheme) {
      map.certifications.push({
        standardNumber: scheme.standardNumber,
        scheme: scheme.scheme,
        mandatoryQco: scheme.mandatoryQco,
        certificationRoute: scheme.certificationRoute,
        verificationStatus: scheme.verificationStatus,
        sourceUrl: scheme.sourceUrl,
      });
    }

    // Verbatim parameters from the matched entry. No clause numbers: the
    // reference dataset has none, and the previous "Section 4.1" / "Section
    // 5" values were invented.
    for (const parameter of scheme.testingParameters) {
      map.testing.push({
        parameter,
        standardNumber: scheme.standardNumber,
        sourceUrl: scheme.sourceUrl,
      });
    }
  }

  return map;
}
