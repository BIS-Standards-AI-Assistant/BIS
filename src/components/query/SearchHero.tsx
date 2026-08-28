"use client";

import { useState } from "react";
import { SearchIcon, ArrowRightIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function SearchHero({
  onSubmit,
  loading,
  compact = false,
}: {
  onSubmit: (query: string) => void;
  loading: boolean;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const { t } = useLanguage();

  function submit(q: string) {
    if (q.trim()) onSubmit(q.trim());
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <div
          className={`flex items-center gap-2 rounded-xl border border-border-strong bg-surface-raised shadow-sm focus-within:border-blue ${
            compact ? "p-1.5" : "p-2"
          }`}
        >
          <SearchIcon className="ml-2.5 h-5 w-5 shrink-0 text-ink-faint" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={compact ? t.hero.searchPlaceholderCompact : t.hero.searchPlaceholderFull}
            aria-label={t.hero.searchPlaceholderCompact}
            className={`flex-1 bg-transparent px-1 text-ink outline-none placeholder:text-ink-faint ${
              compact ? "py-2 text-sm" : "py-3 text-[15px]"
            }`}
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg bg-blue font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-40 ${
              compact ? "px-4 py-2 text-sm" : "px-6 py-3 text-[15px]"
            }`}
          >
            {loading ? t.hero.searching : t.hero.searchButton}
            {!loading && <ArrowRightIcon className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {!compact && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-faint">{t.hero.popularLabel}</span>
          {t.hero.popularItems.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setValue(ex);
                submit(ex);
              }}
              className="rounded-full border border-border bg-surface-raised px-3 py-1 text-xs text-ink-soft transition-colors hover:border-blue hover:text-blue"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
