import React, { useState } from "react";
import type { ComplianceMap } from "@/types/api";
import { LaboratoryMap } from "./LaboratoryMap";

interface ProductComplianceMapProps {
  complianceMap: ComplianceMap;
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
 */
export function ProductComplianceMap({ complianceMap }: ProductComplianceMapProps) {
  // Applicable standards are already shown on the left (Sources panel) and
  // as the centre's own recommendation cards — no "Standards" tab here, to
  // avoid a third, differently-labelled copy of the same list.
  const [activeTab, setActiveTab] = useState<"certifications" | "testing" | "laboratories">("certifications");
  const [selectedState, setSelectedState] = useState<string>("All States");

  const uniqueStates = ["All States", ...Array.from(new Set(complianceMap.laboratories.map((l) => l.state))).filter(Boolean).sort()];

  const filteredLabs = selectedState === "All States" ? complianceMap.laboratories : complianceMap.laboratories.filter((l) => l.state === selectedState);

  const tabs = [
    { id: "certifications", label: "Certification", count: complianceMap.certifications.length },
    { id: "testing", label: "Testing", count: complianceMap.testing.length },
    { id: "laboratories", label: "Labs", count: filteredLabs.length },
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
        <p className="mt-0.5 text-[10.5px] leading-snug text-white/70">Regulatory pathway for this product.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border/60 bg-surface-alt/60 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
              activeTab === tab.id ? "bg-navy text-white" : "text-ink-soft hover:bg-surface-alt hover:text-ink"
            }`}
          >
            {tab.label}
            <span
              className={`inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                activeTab === tab.id ? "bg-white/25 text-white" : "bg-border/60 text-ink-faint"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-3">

        {activeTab === "certifications" && (
          <div className="space-y-2.5">
            {complianceMap.certifications.length === 0 ? (
              <EmptyState message="No specific certification schemes mapped." />
            ) : (
              complianceMap.certifications.map((cert, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
                  <p className="text-[12px] font-bold text-ink">{cert.scheme}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    Status: <span className="font-semibold text-ink">{cert.status}</span>
                  </p>
                  {cert.sourceUrl && (
                    <a
                      href={cert.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-navy hover:underline"
                    >
                      Source
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "testing" && (
          <div className="space-y-2.5">
            {complianceMap.testing.length === 0 ? (
              <EmptyState message="No specific testing requirements identified." />
            ) : (
              complianceMap.testing.map((test, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
                  <p className="text-[12px] font-bold text-ink">{test.testName}</p>
                  <p className="mt-1 text-[11px] text-ink-soft">
                    {test.standard}
                    {test.clause && ` · clause ${test.clause}`}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "laboratories" && (
          <div className="space-y-3">
            <p className="text-[11.5px] leading-relaxed text-ink-soft">
              Recognised laboratories capable of testing against the identified standards.
            </p>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[11.5px] text-ink outline-none focus:border-navy"
            >
              {uniqueStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <LaboratoryMap laboratories={filteredLabs} />

            <div>
              <h3 className="border-b border-border/60 pb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
                Laboratory directory
              </h3>
              <div className="mt-2 space-y-2">
                {filteredLabs.length === 0 ? (
                  <EmptyState message="No laboratories found for the selected state." />
                ) : (
                  filteredLabs.map((lab, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
                      <p className="text-[12px] font-bold text-ink">{lab.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {lab.city}, {lab.state}
                      </p>
                      {lab.testingCapabilities.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {lab.testingCapabilities.map((cap, j) => (
                            <span key={j} className="inline-flex items-center rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <svg className="mb-2.5 h-8 w-8 text-ink-faint/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-[12px] font-medium text-ink-faint">{message}</p>
    </div>
  );
}
