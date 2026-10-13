"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLanguage, LANGUAGES } from "@/components/providers/LanguageProvider";
import { ChevronDownIcon, GlobeIcon } from "@/components/ui/icons";
import type { LangCode } from "@/lib/i18n";

/**
 * A disclosure button revealing a list of language buttons. Deliberately
 * not role="listbox": a listbox promises arrow-key selection, which plain
 * buttons don't provide, so screen-reader users were told to use keys that
 * did nothing. Buttons in a disclosure are reachable with Tab and work with
 * Enter/Space, which is what this actually is.
 */
export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      // Tabbing out of the open list closes it rather than leaving it
      // floating over the page.
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Language: ${current.label}`}
        className="flex items-center gap-1.5 hover:text-white"
      >
        <GlobeIcon className="h-3.5 w-3.5" />
        {current.label}
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {open && (
        <ul
          id={listId}
          aria-label="Choose language"
          className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 text-ink shadow-lg"
        >
          {LANGUAGES.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                aria-current={option.code === lang ? "true" : undefined}
                disabled={!option.available}
                onClick={() => {
                  if (option.available) {
                    setLang(option.code as LangCode);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] ${
                  option.code === lang ? "bg-surface-alt font-medium text-navy" : "text-ink-soft"
                } ${option.available ? "hover:bg-surface-alt" : "cursor-not-allowed opacity-50"}`}
              >
                {/* Tagged with its own language so a screen reader pronounces
                    each native name in that language, not as English. */}
                <span lang={option.code}>{option.nativeLabel}</span>
                {!option.available && <span className="text-[10px] text-ink-faint">Soon</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
