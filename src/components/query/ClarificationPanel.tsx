"use client";

import { useState, useMemo, useEffect } from "react";
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
 * - Clicking each recommendation pops up a small input column underneath where user can write or customize their answer.
 * - Clicking "Refine Search" displays an animated combining step showing all inputs being synthesized together before executing search.
 */
export function ClarificationPanel({
  items,
  product,
  currentQuery = "",
  onRefine,
  loading = false,
}: ClarificationPanelProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStep, setSynthesisStep] = useState(1);

  // Clear synthesizing state when parent loading finishes
  useEffect(() => {
    if (!loading) {
      setIsSynthesizing(false);
    }
  }, [loading]);

  // Strictly filter out generic labels and provide product-specific options
  const displayItems = useMemo(() => {
    const specificItems = (items || []).filter((item) => !isForbiddenGeneric(item));
    if (specificItems.length >= 2) return specificItems;
    return getProductRefinements(currentQuery, product);
  }, [items, currentQuery, product]);

  if (!displayItems || displayItems.length === 0) return null;

  function toggleOption(item: string) {
    setSelectedKeys((prev) => {
      if (prev.includes(item)) {
        return prev.filter((i) => i !== item);
      } else {
        // Initialize input value with recommendation text
        setInputValues((current) => ({
          ...current,
          [item]: current[item] || item,
        }));
        return [...prev, item];
      }
    });
  }

  function handleInputChange(key: string, value: string) {
    setInputValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleRefineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onRefine || loading || selectedKeys.length === 0) return;

    const finalSpecs = selectedKeys
      .map((k) => inputValues[k]?.trim() || k)
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
      onRefine(refinedQuery);
    }, 1400);
  }

  const productName = product?.trim()
    ? product.charAt(0).toUpperCase() + product.slice(1)
    : "";

  const activeSpecs = selectedKeys
    .map((k) => inputValues[k]?.trim() || k)
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
                Click any recommendation to select and customize its exact measurement or specification:
              </p>
            </div>

            {selectedKeys.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-1 text-xs font-bold text-white shadow-2xs">
                <span>{selectedKeys.length} selected</span>
              </span>
            )}
          </div>

          {/* Horizontally organized recommendations chips (in the exact same place) */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {displayItems.map((item, idx) => {
              const isSelected = selectedKeys.includes(item);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleOption(item)}
                  disabled={loading || isSynthesizing}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? "bg-navy text-white hover:bg-navy-deep border border-navy ring-2 ring-navy/20"
                      : "bg-surface-alt text-ink border border-border-strong hover:border-navy hover:text-navy hover:bg-navy/5"
                  }`}
                >
                  <span className={`font-bold ${isSelected ? "text-gold" : "text-navy"}`}>
                    {isSelected ? "✓" : "+"}
                  </span>
                  <span>{item}</span>
                </button>
              );
            })}
          </div>

          {/* Small input columns pop up under recommendations when selected */}
          {selectedKeys.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-border/70 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                  Customize Values ({selectedKeys.length}):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKeys([]);
                    setInputValues({});
                  }}
                  className="text-[11px] font-medium text-ink-faint hover:text-red-600 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {selectedKeys.map((key) => (
                  <div
                    key={key}
                    className="flex flex-col gap-1 rounded-xl border border-navy/25 bg-surface p-2.5 shadow-2xs transition-all focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/15"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-navy">
                      <span className="truncate">{key}</span>
                      <button
                        type="button"
                        onClick={() => toggleOption(key)}
                        className="text-ink-faint hover:text-red-600 transition-colors p-0.5"
                        title="Remove specification"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={inputValues[key] ?? key}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      placeholder={`e.g. ${key}`}
                      className="w-full text-xs font-medium text-ink bg-transparent border-0 outline-none placeholder:text-ink-faint focus:ring-0"
                    />
                  </div>
                ))}
              </div>
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

              {/* Displaying the inputs being combined */}
              {activeSpecs.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-ink-soft">Combining:</span>
                  {activeSpecs.map((spec, sIdx) => (
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
