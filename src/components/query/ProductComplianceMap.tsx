"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { ComplianceMap } from "@/types/api";
import type { LaboratoryItem } from "@/lib/laboratories";
import { LaboratoriesMapLoader } from "@/components/testing/LaboratoriesMapLoader";

interface ProductComplianceMapProps {
  complianceMap: ComplianceMap;
}

interface LabsResponse {
  items: Array<LaboratoryItem & { recognitionExpired: boolean }>;
  total: number;
  states: Array<{ state: string; count: number }>;
}

/**
 * Lives in the right Workspace panel, a fixed ~320-360px column — so unlike
 * most of this app's components, every layout choice here has to work at
 * that one width. Tailwind's `sm:`/`md:` breakpoints are keyed to the
 * *viewport*, not this container, so on an ordinary desktop window they
 * fire even though the actual available width is a narrow sidebar; this
 * component deliberately has none of them; it always renders as if it
 * were on a narrow screen, in an app that mostly does not use container
 * queries. It also uses this app's design tokens (navy/ink/surface/border)
 * instead of raw Tailwind slate/blue, to match everything around it.
 *
 * TRUTH RULES, and why this panel looks the way it does. Its previous
 * version rendered a Leaflet map of laboratories at coordinates generated
 * by `Math.random()`, described them as "capable of testing against the
 * identified standards", and showed a hardcoded certification scheme plus
 * invented test clause numbers for every result. None of that was real.
 * The BIS recognised-laboratory list carries no coordinates and no
 * per-standard testing scope, so there is no honest map to draw and no
 * honest way to filter labs by standard — the Labs tab is now a location
 * directory that says so, following the same "count-by-state, not a
 * geolocated map" reasoning already used by
 * src/components/testing/LaboratoriesDirectory.tsx. Certification and
 * testing rows now come from the fact-checked reference dataset, matched
 * by exact edition, and are simply absent when nothing matched.
 */
export function ProductComplianceMap({ complianceMap }: ProductComplianceMapProps) {
  const [activeTab, setActiveTab] = useState<"certifications" | "testing" | "laboratories">("certifications");

  const tabs = [
    { id: "certifications", label: "Certification", count: complianceMap.certifications.length },
    { id: "testing", label: "Testing", count: complianceMap.testing.length },
    { id: "laboratories", label: "Labs", count: null },
  ] as const;

  return (
    <div className="overflow-hidden rounded-lg border border-border-strong/70 bg-surface-raised">
      <div className="border-b border-border/60 bg-navy px-3 py-2.5">
        <h2 className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
          <svg className="h-4 w-4 shrink-0 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Product Compliance Map
        </h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-white/70">
          Regulatory information on record for the identified standards.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border/60 bg-surface-alt/60 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "true" : undefined}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
              activeTab === tab.id ? "bg-navy text-white" : "text-ink-soft hover:bg-surface-alt hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  activeTab === tab.id ? "bg-white/25 text-white" : "bg-border/60 text-ink-faint"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-3">
        {activeTab === "certifications" && (
          <div className="space-y-2.5">
            {complianceMap.certifications.length === 0 ? (
              <UnmatchedState unmatched={complianceMap.unmatchedStandards} kind="certification scheme" />
            ) : (
              complianceMap.certifications.map((cert, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
                  <p className="text-[12px] font-bold text-ink">{cert.scheme}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    For <span className="font-semibold text-ink">{cert.standardNumber}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-ink-soft">
                    QCO:{" "}
                    <span className="font-semibold text-ink">
                      {cert.mandatoryQco ? "Mandatory under a Quality Control Order" : "Not recorded as mandatory"}
                    </span>
                  </p>
                  {cert.certificationRoute && (
                    <p className="mt-1 text-[11px] leading-snug text-ink-soft">Route: {cert.certificationRoute}</p>
                  )}
                  {cert.verificationStatus && (
                    <p className="mt-1 text-[10.5px] italic leading-snug text-ink-faint">
                      Reference-data status: {cert.verificationStatus}
                    </p>
                  )}
                  {cert.sourceUrl && <SourceLink href={cert.sourceUrl} />}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "testing" && (
          <div className="space-y-2.5">
            {complianceMap.testing.length === 0 ? (
              <UnmatchedState unmatched={complianceMap.unmatchedStandards} kind="testing parameter" />
            ) : (
              <>
                <p className="text-[10.5px] leading-snug text-ink-faint">
                  Key testing parameters recorded for the applicable certification scheme. These name what is tested,
                  not the clause that specifies it — the reference dataset carries no clause numbers.
                </p>
                {complianceMap.testing.map((test, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
                    <p className="text-[12px] font-bold text-ink">{test.parameter}</p>
                    <p className="mt-1 text-[11px] text-ink-soft">{test.standardNumber}</p>
                    {test.sourceUrl && <SourceLink href={test.sourceUrl} />}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "laboratories" && <LaboratoriesTab />}
      </div>
    </div>
  );
}

/**
 * The recognised-laboratory list is a location/status directory: BIS
 * publishes no per-standard testing scope with it, so this tab cannot and
 * does not claim these labs test the standards above. It says that
 * outright rather than implying a link by proximity.
 */
function LaboratoriesTab() {
  const [data, setData] = useState<LabsResponse | null>(null);
  const [selectedState, setSelectedState] = useState("All States");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (selectedState !== "All States") params.set("state", selectedState);

    // The "loading" reset is inside the async callback chain rather than
    // in the effect body: setting state synchronously while the effect
    // runs triggers a cascading render (react-hooks/set-state-in-effect).
    // `status` already starts at "loading", so the only case this needs to
    // handle is a state-filter change, which is covered by the settled
    // branches below.
    fetch(`/api/v1/laboratories?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: LabsResponse) => {
        if (cancelled) return;
        setData(body);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedState]);

  const states = data?.states ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
        <p className="text-[11px] leading-relaxed text-ink-soft">
          BIS-recognised laboratories, listed by location and recognition status. The published recognition list does
          not state which standards a laboratory tests to, so this directory is <strong>not</strong> filtered by the
          standards above — confirm scope with the laboratory or BIS directly.
        </p>
      </div>

      {status === "ready" && data && data.items.length > 0 && (
        <LaboratoriesMapLoader laboratories={data.items} heightClass="h-[220px]" />
      )}

      <select
        value={selectedState}
        onChange={(e) => setSelectedState(e.target.value)}
        aria-label="Filter laboratories by state"
        className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[11.5px] text-ink outline-none focus:border-navy"
      >
        <option value="All States">All states{data ? ` (${data.total})` : ""}</option>
        {states.map((s) => (
          <option key={s.state} value={s.state}>
            {s.state} ({s.count})
          </option>
        ))}
      </select>

      {status === "loading" && <p className="py-6 text-center text-[11.5px] text-ink-faint">Loading directory…</p>}
      {status === "error" && (
        <p className="py-6 text-center text-[11.5px] text-ink-faint">The laboratory directory could not be loaded.</p>
      )}

      {status === "ready" && data && (
        <div>
          <h3 className="border-b border-border/60 pb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
            {data.items.length} recognised {data.items.length === 1 ? "laboratory" : "laboratories"}
          </h3>
          <div className="mt-2 space-y-2">
            {data.items.slice(0, 25).map((lab) => (
              <div key={lab.id} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
                <p className="text-[12px] font-bold text-ink">{lab.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">{[lab.city, lab.state].filter(Boolean).join(", ")}</p>
                <p className="mt-1 text-[10.5px] text-ink-faint">
                  {lab.type} · OSL {lab.oslCode} ·{" "}
                  <span
                    className={
                      lab.currentStatus === "Active" && !lab.recognitionExpired
                        ? "text-ink-soft"
                        : "font-semibold text-ink"
                    }
                  >
                    {lab.recognitionExpired ? "Recognition expired" : lab.currentStatus}
                  </span>
                </p>
              </div>
            ))}
          </div>
          {data.items.length > 25 && (
            <p className="mt-2 text-[10.5px] text-ink-faint">Showing the first 25 of {data.items.length}.</p>
          )}
          <Link
            href="/testing/laboratory-search"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-navy hover:underline"
          >
            Open the full laboratory directory →
          </Link>
        </div>
      )}
    </div>
  );
}

function SourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-navy hover:underline"
    >
      Source
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

/**
 * An empty section here means "no reference entry matched", which is a
 * different claim from "nothing is required" — naming the unmatched
 * standards keeps the user from reading silence as a clearance.
 */
function UnmatchedState({ unmatched, kind }: { unmatched: string[]; kind: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <svg className="mb-2.5 h-8 w-8 text-ink-faint/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-[12px] font-medium text-ink-faint">No {kind} on record for these standards.</p>
      {unmatched.length > 0 && (
        <p className="mt-1.5 px-2 text-[11px] leading-snug text-ink-faint">
          {unmatched.join(", ")} {unmatched.length === 1 ? "has" : "have"} no entry in the certification reference
          dataset for this exact edition. That is a gap in the reference data — not confirmation that certification is
          not required.
        </p>
      )}
    </div>
  );
}
