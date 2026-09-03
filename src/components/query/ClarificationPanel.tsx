"use client";

import { useState, useMemo } from "react";
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
 * Recommended options are strictly concrete product specifications (e.g. "Stainless Steel Grade 304",
 * "Vacuum Insulated Flask", "Two-Wheeler Motorcycle (IS 4151)") tailored to the product searched.
 * Clicking each option directly selects/adds it (toggled with a checkmark).
 * Clicking "Refine Search" executes the search with all selected specifications.
 * No generic placeholders (e.g. "intended use"), no input boxes, pure direct selection.
 */
export function ClarificationPanel({
  items,
  product,
  currentQuery = "",
  onRefine,
  loading = false,
}: ClarificationPanelProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Strictly filter out any generic abstract labels (e.g. "intended use", "material grade", "size or capacity")
  // and ensure concrete specifications for the searched product are always available.
  const displayItems = useMemo(() => {
    const specificItems = (items || []).filter((item) => !isForbiddenGeneric(item));
    if (specificItems.length >= 2) return specificItems;
    return getProductRefinements(currentQuery, product);
  }, [items, currentQuery, product]);

  if (!displayItems || displayItems.length === 0) return null;

  function toggleOption(item: string) {
    setSelectedOptions((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function handleRefineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onRefine || loading || selectedOptions.length === 0) return;

    const refinedQuery = currentQuery
      ? `${currentQuery} ${selectedOptions.join(" ")}`.trim()
      : selectedOptions.join(" ").trim();

    onRefine(refinedQuery);
  }

  const productName = product?.trim()
    ? product.charAt(0).toUpperCase() + product.slice(1)
    : "";

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
                Click any recommended specification below to add it directly to your query:
              </p>
            </div>

            {selectedOptions.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-1 text-xs font-bold text-white shadow-2xs">
                <span>{selectedOptions.length} selected</span>
              </span>
            )}
          </div>

          {/* Horizontally organized chips - click to directly select/add */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {displayItems.map((item, idx) => {
              const isSelected = selectedOptions.includes(item);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleOption(item)}
                  disabled={loading}
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

          {/* Clean Refine Search Button - shows when options are selected */}
          {selectedOptions.length > 0 && (
            <form onSubmit={handleRefineSubmit} className="mt-4 pt-3 border-t border-border/70 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-navy-deep transition-all cursor-pointer"
              >
                {loading ? (
                  <span>Searching Refined Standards...</span>
                ) : (
                  <>
                    <span>Refine Search</span>
                    <span aria-hidden="true">&rarr;</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
