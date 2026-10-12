import { ConfidenceBadge } from "@/components/query/ConfidenceBadge";
import { InfoCard } from "@/components/query/InfoCard";
import type { QueryResponse } from "@/types/api";
import { LightbulbIcon } from "./icons";

/**
 * §7: the evidence-grounded summary for the current search, kept compact in
 * the left panel rather than competing with the centre conversation for
 * primary screen space.
 */
export function ResearchSummary({ result }: { result: QueryResponse }) {
  const supportingSources = result.recommendations.reduce((n, r) => n + r.evidence.length, 0);

  return (
    <section className="mt-3 rounded-lg border border-border-strong/70 bg-surface-raised p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-navy">
          Research Summary
        </h3>
        <ConfidenceBadge confidence={result.confidence} />
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{result.answer}</p>
      {result.translated && (
        <p className="mt-2 text-[10.5px] text-ink-faint">
          Translated to English for search; shown here in your language.
        </p>
      )}
      <details className="mt-2.5 rounded-md bg-surface-alt/80 border border-border/60 p-2.5 text-[11px]">
        <summary className="cursor-pointer font-bold uppercase tracking-wider text-[10px] text-ink-faint">
          Technical details
        </summary>
        <p className="mt-1.5 text-ink-soft leading-relaxed">
          {result.recommendations.length} candidate standard{result.recommendations.length === 1 ? "" : "s"}
          {" · "}
          {supportingSources} supporting source
          {supportingSources === 1 ? "" : "s"}
          {typeof result.latencyMs === "number" && (
            <>
              {" · "}
              <span className="tabular-nums">{(result.latencyMs / 1000).toFixed(1)}s response</span>
            </>
          )}
        </p>
        {result.limitations.length > 0 && (
          <ul className="mt-1.5 space-y-1 text-ink-soft leading-relaxed">
            {result.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}

const EXAMPLE_SEARCHES = [
  "Steel water bottle",
  "Packaged drinking water",
  "Stainless steel utensils",
  "Helmets for two wheeler riders",
  "Domestic pressure cooker",
  "LED bulb",
];

/** Shown when the query is not about BIS standards at all, with example searches to try instead. */
export function IrrelevantSearchNotice({ message, onResearch }: { message: string; onResearch: (query: string) => void }) {
  return (
    <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft/40 p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-danger/15 text-xs font-bold text-danger">
          !
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[12px] font-bold text-danger">This is not a relevant BIS search</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{message}</p>
          <div className="mt-2.5 border-t border-danger/15 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Try instead:</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {EXAMPLE_SEARCHES.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onResearch(prompt)}
                  className="rounded-full border border-border-strong bg-surface-raised px-2 py-0.5 text-[10.5px] font-medium text-navy transition-colors hover:border-navy hover:bg-navy/5"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Certification and testing notes; renders nothing when neither is available. */
export function CertificationAndTesting({ result }: { result: QueryResponse }) {
  if (!result.certification.available && !result.testing.available) return null;
  return (
    <div className="mt-3 space-y-2">
      <InfoCard
        title="Certification"
        available={result.certification.available}
        notes={result.certification.notes}
        unavailableMessage="We could not establish a reliable certification pathway from the available sources."
      />
      <InfoCard
        title="Testing"
        available={result.testing.available}
        notes={result.testing.notes}
        unavailableMessage="No testing information could be verified from the available sources."
      />
    </div>
  );
}

/** The query's suggested next steps, collapsed by default. */
export function NextSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <details className="mt-3 rounded-lg border border-navy/30 bg-navy/5 p-2.5 text-[11px]">
      <summary className="flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px] text-navy">
        <LightbulbIcon className="h-3.5 w-3.5 shrink-0" />
        View insight — next steps
      </summary>
      <ol className="mt-1.5 space-y-1">
        {steps.map((step, i) => (
          <li key={i} className="text-[11.5px] leading-snug text-ink-soft">
            {i + 1}. {step}
          </li>
        ))}
      </ol>
    </details>
  );
}
