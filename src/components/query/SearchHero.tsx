"use client";

import { useState } from "react";

const EXAMPLES = [
  "I want to manufacture stainless steel water bottles for children.",
  "Which Indian Standard applies to packaged drinking water bottles?",
  "What testing requirements apply to stainless steel cookware?",
];

export function SearchHero({
  onSubmit,
  loading,
}: {
  onSubmit: (query: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <div>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
        Find the Indian Standard that applies to your product.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
        Describe your product, process, or compliance question in plain language. Every
        recommendation is backed by evidence from official BIS documents — not a guess.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
        className="mt-8"
      >
        <div className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface-raised p-2 shadow-sm focus-within:border-accent">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Describe your product or compliance question…"
            aria-label="Describe your product or compliance question"
            className="flex-1 bg-transparent px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-ink/90 disabled:opacity-40"
          >
            {loading ? "Searching…" : "Find applicable standard"}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs font-medium text-ink-faint">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setValue(ex);
              onSubmit(ex);
            }}
            className="rounded-full border border-border px-3 py-1 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
