"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, CloseIcon } from "@/components/ui/icons";

const CHIPS = ["Standards", "Certification", "Testing", "Services"] as const;

const EXAMPLE = "I manufacture stainless steel kitchen utensils. Which Indian Standards should I look at?";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-navy-deep/40 px-4 pt-[10vh] backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search BIS Standards, Services & Documents"
        className="h-fit w-full max-w-[640px] rounded-xl border border-border bg-surface-raised shadow-[0_24px_48px_-16px_rgba(4,41,79,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
          className="flex items-center gap-3 border-b border-border px-5 py-4"
        >
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BIS Standards, Services & Documents"
            aria-label="Search BIS Standards, Services & Documents"
            className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-md p-1.5 text-ink-faint hover:bg-surface-alt hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </form>

        <div className="px-5 py-4">
          <button
            type="button"
            onClick={() => submit(EXAMPLE)}
            className="block w-full rounded-lg border border-border bg-surface-alt px-4 py-3 text-left text-[13px] leading-relaxed text-ink-soft transition-colors hover:border-blue hover:text-blue"
          >
            <span className="mr-1.5 font-semibold text-ink-faint">Try asking</span>
            &ldquo;{EXAMPLE}&rdquo;
          </button>

          <div className="mt-4 flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => submit(chip)}
                className="rounded-full border border-border-strong px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue"
              >
                {chip}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11.5px] text-ink-faint">
            Try an exact identifier (&ldquo;IS 5522:2014&rdquo;), a keyword (&ldquo;stainless steel
            utensils&rdquo;), or a full question — plus{" "}
            <kbd className="rounded border border-border-strong bg-surface-alt px-1.5 py-0.5 font-mono text-[10.5px]">
              ESC
            </kbd>{" "}
            to close.
          </p>
        </div>
      </div>
    </div>
  );
}
