"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchIcon, CloseIcon } from "@/components/ui/icons";
import { resolveStandardIds } from "@/lib/standards-id";
import type { SearchState, SearchSuggestion } from "@/lib/search-state";
import type { RetrievedChunk } from "@/types/api";

const SHORTCUT_LINKS = [
  { label: "Standards", href: "/standards" },
  { label: "Certification", href: "/certification" },
  { label: "Testing", href: "/testing" },
  { label: "Search Documents", href: "/search" },
  { label: "Compare", href: "/compare" },
] as const;

const EXAMPLE = "I manufacture stainless steel kitchen utensils. Which Indian Standards should I look at?";
const DEBOUNCE_MS = 300;
const SUGGESTION_LIMIT = 5;

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Suggestions are built from two sources, never fabricated:
 * 1. Deterministic exact-identifier detection (resolveStandardIds — the
 *    same resolver retrieval.ts uses server-side; pure regex, no network,
 *    so it's instant and safe to run on every keystroke).
 * 2. A debounced call to the real /api/v1/search endpoint (cheap
 *    keyword+semantic retrieval, no LLM), deduped to one suggestion per
 *    distinct standard actually returned.
 */
export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "empty" });
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const identifierSuggestions: SearchSuggestion[] = useMemo(() => {
    if (!query.trim()) return [];
    return resolveStandardIds(query).map((r) => ({
      kind: "identifier" as const,
      label: r.normalized,
      sublabel: "Look up this exact standard",
      href: `/?q=${encodeURIComponent(r.normalized)}`,
    }));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [open, onClose]);

  // Debounced typeahead against the real search endpoint. Skipped entirely
  // when the query already resolves to an exact identifier — an exact hit
  // needs no fuzzy suggestion list per the identifier-priority rule.
  useEffect(() => {
    const trimmed = query.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets suggestion highlight whenever the query itself changes
    setActiveIndex(-1);

    if (!trimmed) {
      setState({ kind: "empty" });
      return;
    }
    if (identifierSuggestions.length > 0) {
      setState({ kind: "typing", query: trimmed });
      return;
    }

    setState({ kind: "typing", query: trimmed });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, limit: SUGGESTION_LIMIT }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error("request_failed");
          return res.json();
        })
        .then((data: { results: RetrievedChunk[] }) => {
          const seen = new Set<string>();
          const suggestions: SearchSuggestion[] = [];
          for (const r of data.results ?? []) {
            const key = r.standardNumber ?? r.documentId;
            if (seen.has(key)) continue;
            seen.add(key);
            suggestions.push({
              kind: "standard",
              label: r.standardNumber ?? r.title,
              sublabel: r.title,
              href: `/standards/${r.documentId}`,
            });
          }
          if (suggestions.length === 0) {
            setState({ kind: "no_results", query: trimmed });
          } else {
            setState({ kind: "suggestions", query: trimmed, suggestions });
          }
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          // Typeahead is a convenience, not a critical path — a failed
          // suggestion fetch degrades to "no suggestions available," not a
          // blocking error. The user can still submit the raw query.
          setState({ kind: "offline", query: trimmed });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identifierSuggestions is derived from query; including it would re-run this effect twice per keystroke
  }, [query]);

  const suggestions: SearchSuggestion[] =
    identifierSuggestions.length > 0
      ? identifierSuggestions
      : state.kind === "suggestions"
        ? state.suggestions
        : [];

  if (!open) return null;

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    onClose();
    // A typed question goes to the AI Assistant on the home workspace, not
    // to /search — that page is keyword document search, reached from the
    // navigation, and answers nothing. The assistant picks the query up
    // from ?q= and runs it straight away.
    router.push(`/?q=${encodeURIComponent(trimmed)}`);
  }

  function selectSuggestion(s: SearchSuggestion) {
    onClose();
    router.push(s.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
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
            if (activeIndex >= 0 && suggestions[activeIndex]) {
              selectSuggestion(suggestions[activeIndex]);
            } else {
              submit(query);
            }
          }}
          className="flex items-center gap-3 border-b border-border px-5 py-4"
        >
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search BIS Standards, Services & Documents"
            aria-label="Search BIS Standards, Services & Documents"
            aria-autocomplete="list"
            aria-controls="search-overlay-suggestions"
            aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined}
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
          {suggestions.length > 0 ? (
            <ul id="search-overlay-suggestions" role="listbox" aria-label="Suggestions" className="space-y-1">
              {suggestions.map((s, i) => (
                <li key={s.href} role="option" aria-selected={i === activeIndex} id={`search-suggestion-${i}`}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors ${
                      i === activeIndex ? "bg-surface-alt" : "hover:bg-surface-alt"
                    }`}
                  >
                    <span className="font-mono text-[13px] font-medium text-navy">{s.label}</span>
                    {s.sublabel && <span className="text-[12px] text-ink-faint">{s.sublabel}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : state.kind === "no_results" ? (
            <p className="px-1 py-2 text-[13px] text-ink-faint">
              No matching BIS standards found for &ldquo;{state.query}&rdquo; — press Enter to search anyway.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => submit(EXAMPLE)}
                className="block w-full rounded-lg border border-border bg-surface-alt px-4 py-3 text-left text-[13px] leading-relaxed text-ink-soft transition-colors hover:border-blue hover:text-blue"
              >
                <span className="mr-1.5 font-semibold text-ink-faint">Try asking</span>
                &ldquo;{EXAMPLE}&rdquo;
              </button>

              <div className="mt-4">
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">Browse by section</p>
                <div className="flex flex-wrap gap-2">
                  {SHORTCUT_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className="rounded-full border border-border-strong px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="mt-4 text-[11.5px] text-ink-faint">
            Try an exact identifier (&ldquo;IS 5522:2014&rdquo;), a keyword (&ldquo;stainless steel
            utensils&rdquo;), or a full question — use{" "}
            <kbd className="rounded border border-border-strong bg-surface-alt px-1.5 py-0.5 font-mono text-[10.5px]">↑↓</kbd>{" "}
            to navigate suggestions and{" "}
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
