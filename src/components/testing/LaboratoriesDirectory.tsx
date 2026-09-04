"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { LaboratoryItem } from "@/lib/laboratories";

const STATUS_TONE: Record<LaboratoryItem["currentStatus"], "success" | "danger" | "warning" | "neutral"> = {
  Active: "success",
  Suspended: "danger",
  Deferred: "warning",
  Unknown: "neutral",
};

function formatDate(iso: string | null, raw: string): string {
  if (!iso) return raw || "Not available";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function LaboratoriesDirectory({ laboratories }: { laboratories: LaboratoryItem[] }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("All");
  const [status, setStatus] = useState<"All" | LaboratoryItem["currentStatus"]>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lab of laboratories) counts.set(lab.state, (counts.get(lab.state) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [laboratories]);

  const maxStateCount = stateCounts[0]?.[1] ?? 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return laboratories.filter((lab) => {
      const matchesQuery =
        !q ||
        lab.name.toLowerCase().includes(q) ||
        (lab.city ?? "").toLowerCase().includes(q) ||
        lab.oslCode.toLowerCase().includes(q);
      const matchesState = state === "All" || lab.state === state;
      const matchesStatus = status === "All" || lab.currentStatus === status;
      return matchesQuery && matchesState && matchesStatus;
    });
  }, [laboratories, query, state, status]);

  return (
    <div>
      {/* By-state summary — a count-by-state bar, not a geolocated map: the
          source dataset has no coordinates, so this is the honest ceiling
          on "where are these labs" without inventing precision. */}
      <section aria-labelledby="labs-by-state-heading" className="mb-8 border border-border bg-surface-raised p-5">
        <h2 id="labs-by-state-heading" className="text-sm font-semibold text-ink">
          Recognised laboratories by state
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          Grouped by the state on record. The BIS recognition list does not include exact coordinates or per-standard
          testing scope — use the official BIS portal to confirm a laboratory&apos;s exact address and capability.
        </p>
        <ul className="mt-4 space-y-1.5">
          {stateCounts.slice(0, 8).map(([s, count]) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => setState(state === s ? "All" : s)}
                className="group flex w-full items-center gap-3 text-left"
                aria-pressed={state === s}
              >
                <span className={`w-40 shrink-0 truncate text-xs ${state === s ? "font-semibold text-navy" : "text-ink-soft"}`}>
                  {s}
                </span>
                <span className="h-3 flex-1 bg-surface-alt">
                  <span
                    className={`block h-full ${state === s ? "bg-navy" : "bg-blue/60 group-hover:bg-blue"}`}
                    style={{ width: `${Math.max(4, (count / maxStateCount) * 100)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-xs text-ink-faint">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by laboratory name, city, or OSL code…"
            aria-label="Search recognised laboratories"
            className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-blue focus:outline-none"
          />
        </div>

        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          aria-label="Filter by state"
          className="rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-ink focus:border-blue focus:outline-none"
        >
          <option value="All">All states ({laboratories.length})</option>
          {stateCounts.map(([s, count]) => (
            <option key={s} value={s}>
              {s} ({count})
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Filter by recognition status"
          className="rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-ink focus:border-blue focus:outline-none"
        >
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Deferred">Deferred</option>
        </select>
      </div>

      <p className="mb-3 text-xs text-ink-faint">
        {filtered.length} of {laboratories.length} recognised laboratories
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="border border-border bg-surface-raised p-8 text-center">
          <p className="text-sm font-medium text-ink">No recognised laboratory matches these filters.</p>
          <p className="mt-1 text-xs text-ink-faint">Try a different search term, state, or status.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border bg-surface-raised">
          {filtered.map((lab) => (
            <li key={lab.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{lab.name}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {lab.city ? `${lab.city}, ` : ""}
                    {lab.state} · {lab.type} · OSL Code <span className="font-mono">{lab.oslCode}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={STATUS_TONE[lab.currentStatus]}>{lab.currentStatus}</Badge>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                <span>Recognition valid until {formatDate(lab.recognitionValidUpto, lab.recognitionValidUptoRaw)}</span>
                {lab.remarks && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === lab.id ? null : lab.id)}
                    className="text-blue hover:underline"
                    aria-expanded={expandedId === lab.id}
                  >
                    {expandedId === lab.id ? "Hide status history" : "Show status history"}
                  </button>
                )}
              </div>

              {expandedId === lab.id && lab.remarks && (
                <p className="mt-2 border-l-2 border-border-strong pl-3 text-xs leading-relaxed text-ink-faint">
                  {lab.remarks}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
