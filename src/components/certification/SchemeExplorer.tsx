"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ExternalLinkIcon } from "@/components/ui/icons";
import type { CertificationSchemeItem } from "@/app/api/v1/certification-schemes/route";
import { VERIFICATION_STATUS_LABELS } from "@/lib/verification-status";

/**
 * Searches the small, fact-checked reference dataset (48 entries at time
 * of writing, 22 independently verified/corrected + 26 pulled from an
 * upstream update and marked needs_review pending independent checking —
 * see data/bis-standards-dataset/README.md), never the intelligence
 * engine. Labeled honestly as a reference list, not a comprehensive
 * scheme directory — BIS Navigator does not claim to cover every
 * certification scheme BIS operates.
 */
export function SchemeExplorer() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [items, setItems] = useState<CertificationSchemeItem[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (sector) params.set("sector", sector);

    fetch(`/api/v1/certification-schemes?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("request_failed");
        return res.json();
      })
      .then((data) => {
        setItems(data.items ?? []);
        setSectors(data.sectors ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [query, sector]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by standard number, product, or scheme…"
          aria-label="Search certification schemes"
          className="flex-1 rounded-md border border-border-strong bg-surface-raised px-4 py-2.5 text-sm text-ink outline-none focus:border-navy"
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label="Filter by sector"
          className="rounded-md border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-navy"
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-2 text-[11.5px] text-ink-faint">
        A fact-checked reference set of 22 entries — not an exhaustive list of every BIS certification scheme.
      </p>

      <div className="mt-5">
        {loading && <p className="text-sm text-ink-faint">Loading…</p>}

        {!loading && error && (
          <EmptyState
            title="Couldn't load the reference dataset"
            body="This is a local issue, not a sign that no data exists. Try again in a moment."
          />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="No matching entries in the reference dataset"
            body="This search term isn't in BIS Navigator's current 22-entry verified reference set — that doesn't mean no BIS certification applies to it."
            tips={["Try the standard number instead", "Try a broader product category", "Use the certification discovery search below instead"]}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.standardNumber} className="border border-border bg-surface-raised p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-medium text-navy">{item.standardNumber}</p>
                    <h3 className="mt-0.5 text-[15px] font-semibold text-ink">{item.title}</h3>
                  </div>
                  {item.scheme && (
                    <span className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                      {item.scheme}
                    </span>
                  )}
                </div>
                {item.scopeSummary && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.scopeSummary}</p>}
                {item.certificationRoute && (
                  <p className="mt-1.5 text-[13px] text-ink-soft">
                    <span className="font-medium text-ink">Certification route: </span>
                    {item.certificationRoute}
                  </p>
                )}
                {item.testingParameters.length > 0 && (
                  <p className="mt-1 text-[13px] text-ink-soft">
                    <span className="font-medium text-ink">Key testing parameters: </span>
                    {item.testingParameters.join(", ")}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                  {item.verificationStatus && (
                    <span
                      className={
                        item.verificationStatus === "verified_accurate" || item.verificationStatus === "corrected"
                          ? "rounded bg-success-soft px-1.5 py-0.5 font-medium text-success"
                          : "rounded bg-warning-soft px-1.5 py-0.5 font-medium text-warning"
                      }
                    >
                      {VERIFICATION_STATUS_LABELS[item.verificationStatus] ?? item.verificationStatus}
                    </span>
                  )}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-navy hover:underline"
                    >
                      Source document <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
