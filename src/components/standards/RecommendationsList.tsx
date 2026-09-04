import type { Recommendation } from "@/types/api";
import { RecommendationRow } from "@/components/standards/RecommendationRow";
import { EmptyState } from "@/components/feedback/EmptyState";

/**
 * Partitions and lists a query's recommendations as compact rows — lives in
 * the left Sources panel, alongside the rest of the search's retrieval
 * results, so the centre stays a pure conversation. Clicking a row opens
 * its full evidence card in a popup (see HomeClient's recommendation modal).
 */
export function RecommendationsList({
  recommendations,
  onOpen,
}: {
  recommendations: Recommendation[];
  onOpen: (index: number) => void;
}) {
  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No sufficiently relevant standard found"
        body="We couldn't find strong evidence for this query in the current BIS knowledge base."
        tips={[
          "Add the product's material.",
          "Describe the intended use or user group.",
          "Name the product category more specifically.",
        ]}
      />
    );
  }

  // 2026-09-04 applicability-gate fix: partition on the server-authoritative
  // `primaryRecommendation` field, never on array position. Previously this
  // only checked recommendations[0]'s applicability state — a
  // material-mismatched candidate ranked #2+ still rendered identically to
  // a real recommendation under a generic "Other relevant standards"
  // heading. The server already partitions `recommendations` (primary
  // first), but this filters explicitly rather than relying on that
  // ordering alone.
  const primary = recommendations.filter((r) => r.primaryRecommendation);
  const related = recommendations.filter((r) => !r.primaryRecommendation);

  return (
    <>
      {primary.length > 0 ? (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint pb-1.5 border-b border-border/70">
            {primary.length === 1 ? "Recommended standard" : `Recommended standards (${primary.length})`}
          </p>
          <div className="mt-2 space-y-1.5">
            {primary.map((rec) => {
              const idx = recommendations.indexOf(rec);
              return <RecommendationRow key={idx} recommendation={rec} onOpen={() => onOpen(idx)} />;
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No standard meets the applicability bar for this query"
          body="Evidence was retrieved, but none of it establishes that a standard applies to what you described — see the related candidates below for context."
          tips={[
            "Add the product's material.",
            "Describe the intended use or user group.",
            "Name the product category more specifically.",
          ]}
        />
      )}

      {related.length > 0 && (
        <div className="mt-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint pb-1.5 border-b border-border/70">
            Related but not applicable ({related.length})
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
            Retrieved because it is semantically related to your search, but the available evidence does not establish that it applies — not a recommendation.
          </p>
          <div className="mt-2 space-y-1.5">
            {related.map((rec) => {
              const idx = recommendations.indexOf(rec);
              return <RecommendationRow key={idx} recommendation={rec} onOpen={() => onOpen(idx)} />;
            })}
          </div>
        </div>
      )}
    </>
  );
}
