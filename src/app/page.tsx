"use client";

import { useState } from "react";

interface Evidence {
  chunkId: string;
  document: string;
  standardNumber: string | null;
  section: string | null;
  clause: string | null;
  sourceUrl: string;
}

interface Recommendation {
  standardNumber: string | null;
  title: string;
  relevanceScore: number;
  reason: string;
  evidence: Evidence[];
}

interface QueryResponse {
  answer: string;
  intent: string;
  clarificationNeeded?: string[];
  recommendations: Recommendation[];
  certification: { available: boolean; notes: string | null };
  testing: { available: boolean; notes: string | null };
  nextSteps: string[];
  confidence: "high" | "medium" | "low" | "none";
  limitations: string[];
}

const CONFIDENCE_STYLE: Record<QueryResponse["confidence"], string> = {
  high: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  none: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Request failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          BIS Standards Navigator
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Describe your product or question in plain language. Answers are grounded only in
          ingested BIS documents, with evidence and confidence shown for every claim.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. I want to manufacture stainless steel water bottles for children — what standards apply?"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {error && (
          <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-10 space-y-8">
            <section>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                  Answer
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONFIDENCE_STYLE[result.confidence]}`}>
                  Confidence: {result.confidence}
                </span>
              </div>
              <p className="mt-2 text-zinc-800 dark:text-zinc-200">{result.answer}</p>
            </section>

            {result.clarificationNeeded && result.clarificationNeeded.length > 0 && (
              <section className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <h2 className="text-sm font-medium text-amber-900 dark:text-amber-300">
                  This answer would be more precise if you specify:
                </h2>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-800 dark:text-amber-300">
                  {result.clarificationNeeded.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </section>
            )}

            {result.recommendations.length > 0 && (
              <section>
                <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                  Applicable standard(s)
                </h2>
                <div className="mt-3 space-y-4">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {rec.standardNumber ?? "Unnumbered reference"} — {rec.title}
                        </h3>
                        <span className="shrink-0 text-xs text-zinc-500">
                          relevance {Math.round(rec.relevanceScore * 100)}%
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{rec.reason}</p>
                      {rec.evidence.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Evidence
                          </h4>
                          {rec.evidence.map((ev) => (
                            <a
                              key={ev.chunkId}
                              href={ev.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-blue-700 hover:underline dark:text-blue-400"
                            >
                              {ev.document} {ev.section ? `— ${ev.section}` : ""}{" "}
                              {ev.clause ? `(clause ${ev.clause})` : ""}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(result.certification.available || result.testing.available) && (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {result.certification.available && (
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                      Certification
                    </h2>
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {result.certification.notes}
                    </p>
                  </div>
                )}
                {result.testing.available && (
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                      Testing
                    </h2>
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {result.testing.notes}
                    </p>
                  </div>
                )}
              </section>
            )}

            {result.nextSteps.length > 0 && (
              <section>
                <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                  Next steps
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                  {result.nextSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </section>
            )}

            {result.limitations.length > 0 && (
              <section className="rounded-md border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Uncertainty / limitations
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                  {result.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
