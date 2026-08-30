"use client";

import { useState } from "react";
import { LoadingIndicator } from "@/components/query/LoadingIndicator";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RecommendationCard } from "@/components/standards/RecommendationCard";
import { ConflictPanel } from "@/components/standards/ConflictPanel";
import { InfoCard } from "@/components/query/InfoCard";
import { ConfidenceBadge } from "@/components/query/ConfidenceBadge";
import type { QueryResponse } from "@/types/api";

const EXAMPLES = ["electrical appliance", "packaged drinking water", "steel product", "cement product"];

/**
 * Reuses the exact same intelligence engine as the homepage
 * (src/app/api/v1/query/route.ts) — no second pipeline. This component
 * only frames the same engine output around a certification-specific
 * question and surfaces the certification-relevant parts of the response
 * more prominently (InfoCard "Certification" first, then supporting
 * standards). Every fact shown — scheme, standard, requirement, grounding,
 * confidence — is engine-produced; this component only arranges it.
 */
export function CertificationDiscovery() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `What certification do I need for ${trimmed}?` }),
      });
      if (!res.ok) throw new Error("service_unavailable");
      const data: QueryResponse = await res.json();
      setResult(data);
    } catch {
      setError("The BIS Navigator service is temporarily unavailable. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runQuery(query);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tell us what you manufacture or want to certify…"
          aria-label="Describe your product"
          className="flex-1 rounded-md border border-border-strong bg-surface-raised px-4 py-2.5 text-sm text-ink outline-none focus:border-navy"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-40"
        >
          Find certification
        </button>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQuery(ex);
              runQuery(ex);
            }}
            className="rounded-full border border-border-strong px-3 py-1 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-navy hover:text-navy"
          >
            {ex}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        Examples are illustrative only — they aren&apos;t guaranteed certification mappings.
      </p>

      {loading && (
        <div className="mt-6">
          <LoadingIndicator />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorState title="We couldn't connect to the BIS Navigator service" body={error} />
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-raised p-4">
            <p className="text-sm leading-relaxed text-ink">{result.answer}</p>
            <div className="shrink-0">
              <ConfidenceBadge confidence={result.confidence} />
            </div>
          </div>

          <InfoCard
            title="Certification"
            available={result.certification.available}
            notes={result.certification.notes}
            unavailableMessage="Certification information is not available in the current evidence."
          />

          {result.conflicts.length > 0 && <ConflictPanel conflicts={result.conflicts} />}

          {result.recommendations.length === 0 ? (
            <EmptyState
              title="Insufficient evidence to determine the applicable certification pathway"
              body="BIS Navigator couldn't find strong evidence for this product in its current knowledge base."
              tips={["Add the product's material", "Name the product category more specifically", "Try the exact standard number if you know it"]}
            />
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Associated standards</h3>
              {result.recommendations.map((rec, i) => (
                <RecommendationCard key={i} recommendation={rec} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
