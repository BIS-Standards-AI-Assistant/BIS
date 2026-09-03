"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { getProductRefinements, isForbiddenGeneric } from "@/lib/product-refinements";

interface ClarificationPanelProps {
  items: string[];
  product?: string | null;
  currentQuery?: string;
  onRefine?: (newQuery: string) => void;
  loading?: boolean;
}

/**
 * Product-Aware Refinement Panel:
 * - Recommendations stay in place as horizontal clickable chips.
 * - Clicking a recommendation pops up a small compact input box adjusted just below the recommendations.
 * - Only the input for the clicked recommendation is visible (all others disappear).
 * - Input has NO default text; only placeholder text is kept.
 * - On clicking "Refine Search", an animated combining phase displays all inputs being synthesized together.
 */
export function ClarificationPanel({
  items,
  product,
  currentQuery = "",
  onRefine,
  loading = false,
}: ClarificationPanelProps) {
  // Set of selected recommendations
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // Custom text entered by the user (keyed by recommendation)
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  // Which recommendation currently has its small input column open (ONLY ONE AT A TIME)
  const [activeRecommendation, setActiveRecommendation] = useState<string | null>(null);
  // Animation state when Refine Search is clicked
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStep, setSynthesisStep] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);


  // Focus the input when active recommendation changes
  useEffect(() => {
    if (activeRecommendation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeRecommendation]);

  // Strictly filter out forbidden generic labels and provide product-specific options
  const displayItems = useMemo(() => {
    const specificItems = (items || []).filter((item) => !isForbiddenGeneric(item));
    if (specificItems.length >= 2) return specificItems;
    return getProductRefinements(currentQuery, product);
  }, [items, currentQuery, product]);

  if (!displayItems || displayItems.length === 0) return null;

  function handleChipClick(item: string) {
    if (activeRecommendation === item) {
      // Toggle off active popup
      setActiveRecommendation(null);
    } else {
      // Switch active input box to this clicked recommendation (all other input boxes disappear)
      setActiveRecommendation(item);
      // Mark as selected if not already
      if (!selectedKeys.includes(item)) {
        setSelectedKeys((prev) => [...prev, item]);
      }
    }
  }

  function handleInputChange(item: string, value: string) {
    setCustomValues((prev) => ({
      ...prev,
      [item]: value,
    }));
    if (!selectedKeys.includes(item)) {
      setSelectedKeys((prev) => [...prev, item]);
    }
  }

  function removeRecommendation(item: string) {
    setSelectedKeys((prev) => prev.filter((k) => k !== item));
    setCustomValues((prev) => {
      const next = { ...prev };
      delete next[item];
      return next;
    });
    if (activeRecommendation === item) {
      setActiveRecommendation(null);
    }
  }

  function handleRefineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onRefine || loading || selectedKeys.length === 0) return;

    // Use user custom answer if typed; otherwise fallback to recommendation text itself
    const finalSpecs = selectedKeys
      .map((k) => customValues[k]?.trim() || k)
      .filter(Boolean);

    if (finalSpecs.length === 0) return;

    setIsSynthesizing(true);
    setSynthesisStep(1);

    setTimeout(() => {
      setSynthesisStep(2);
    }, 500);

    setTimeout(() => {
      setSynthesisStep(3);
    }, 1000);

    setTimeout(() => {
      const refinedQuery = currentQuery
        ? `${currentQuery} ${finalSpecs.join(" ")}`.trim()
        : finalSpecs.join(" ").trim();
      setIsSynthesizing(false);
      onRefine(refinedQuery);
    }, 1400);
  }

  const productName = product?.trim()
    ? product.charAt(0).toUpperCase() + product.slice(1)
    : "";

  const finalSpecs = selectedKeys
    .map((k) => customValues[k]?.trim() || k)
    .filter(Boolean);

  return (
    <div className="rounded-2xl border border-border-strong/70 bg-surface-raised p-5 sm:p-6 shadow-xs transition-all hover:border-navy/30">
      <div className="flex items-start gap-3.5">
        {/* Precision / Parameter Calibration Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy border border-navy/20">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-navy-deep dark:text-ink">
                {productName
                  ? `Recommended specifications for ${productName}`
                  : "Recommended specifications for your product"}
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Click any recommendation to select it or specify your exact measurement:
              </p>
            </div>

            {selectedKeys.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-1 text-xs font-bold text-white shadow-2xs">
                <span>{selectedKeys.length} selected</span>
              </span>
            )}
          </div>

          {/* Recommendations chips (in the exact same place) */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {displayItems.map((item, idx) => {
              const isSelected = selectedKeys.includes(item);
              const isCurrentlyActive = activeRecommendation === item;
              const displayLabel = customValues[item]?.trim() || item;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(item)}
                  disabled={loading || isSynthesizing}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                    isCurrentlyActive
                      ? "bg-navy text-white ring-2 ring-gold/70 border border-gold"
                      : isSelected
                        ? "bg-navy text-white hover:bg-navy-deep border border-navy ring-2 ring-navy/20"
                        : "bg-surface-alt text-ink border border-border-strong hover:border-navy hover:text-navy hover:bg-navy/5"
                  }`}
                >
                  <span className={`font-bold ${isSelected || isCurrentlyActive ? "text-gold" : "text-navy"}`}>
                    {isSelected ? "✓" : "+"}
                  </span>
                  <span>{displayLabel}</span>
                  {isCurrentlyActive && (
                    <span className="text-[10px] text-white/75">▾</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Small compact input box adjusted just below the recommendations —
              ONLY visible for the recommendation that was clicked, all others disappear.
              NO default text, only placeholder text. */}
          {activeRecommendation && (
            <div className="mt-3 inline-block w-full max-w-sm rounded-xl border border-navy/30 bg-surface p-2.5 shadow-xs transition-all animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between text-[11px] font-semibold text-navy mb-1.5">
                <span className="truncate flex items-center gap-1">
                  <span>Enter specification for</span>
                  <span className="font-bold underline decoration-gold/60">{activeRecommendation}</span>:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveRecommendation(null)}
                  className="text-ink-faint hover:text-navy transition-colors text-xs font-bold px-1"
                  title="Close input"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={customValues[activeRecommendation] || ""}
                  onChange={(e) => handleInputChange(activeRecommendation, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setActiveRecommendation(null);
                    }
                  }}
                  placeholder={`e.g. ${activeRecommendation}`}
                  className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink bg-surface-raised outline-none transition-all focus:border-navy focus:ring-1 focus:ring-navy placeholder:text-ink-faint"
                />
                <button
                  type="button"
                  onClick={() => setActiveRecommendation(null)}
                  className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-deep transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Active selections strip with quick remove if user has selected items */}
          {selectedKeys.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-ink-soft">Active parameters:</span>
              {selectedKeys.map((key) => {
                const text = customValues[key]?.trim() || key;
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-md bg-navy/10 border border-navy/20 px-2 py-0.5 text-[11px] font-medium text-navy"
                  >
                    <span>{text}</span>
                    <button
                      type="button"
                      onClick={() => removeRecommendation(key)}
                      className="text-navy/70 hover:text-red-600 transition-colors font-bold text-[10px] ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Synthesis / Combining Animation Overlay when Refine Search is clicked */}
          {(isSynthesizing || loading) && (
            <div className="mt-4 rounded-xl border border-navy/30 bg-navy/5 p-3.5 shadow-inner animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-navy/40" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-navy" />
                  </div>
                  <span className="text-xs font-bold text-navy">
                    {synthesisStep === 1 && "Taking all customized inputs..."}
                    {synthesisStep === 2 && "Combining inputs and cross-referencing BIS catalog..."}
                    {synthesisStep >= 3 && "Synthesizing refined standards output..."}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-soft">
                  {synthesisStep}/3
                </span>
              </div>

              {/* Displaying all inputs actively being combined */}
              {finalSpecs.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-ink-soft">Combining:</span>
                  {finalSpecs.map((spec, sIdx) => (
                    <span
                      key={sIdx}
                      className="inline-flex items-center rounded-md bg-white dark:bg-surface-raised px-2 py-0.5 font-medium text-navy border border-navy/20 shadow-2xs"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              {/* Animated Progress Bar */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-navy/15">
                <div
                  className="h-full bg-gradient-to-r from-navy via-blue to-gold transition-all duration-500"
                  style={{
                    width: synthesisStep === 1 ? "35%" : synthesisStep === 2 ? "70%" : "100%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Refine Search Button - shows when options are selected and not currently loading */}
          {selectedKeys.length > 0 && !isSynthesizing && !loading && (
            <form onSubmit={handleRefineSubmit} className="mt-4 pt-3 border-t border-border/70 flex justify-end">
              <button
                type="submit"
                disabled={loading || isSynthesizing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-navy-deep transition-all cursor-pointer"
              >
                <span>Refine Search</span>
                <span aria-hidden="true">&rarr;</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
