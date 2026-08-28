"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, LANGUAGES } from "@/components/providers/LanguageProvider";
import { ChevronDownIcon, GlobeIcon } from "@/components/ui/icons";
import type { LangCode } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 hover:text-white"
      >
        <GlobeIcon className="h-3.5 w-3.5" />
        {current.label}
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 text-ink shadow-lg"
        >
          {LANGUAGES.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                role="option"
                aria-selected={option.code === lang}
                disabled={!option.available}
                onClick={() => {
                  if (option.available) {
                    setLang(option.code as LangCode);
                    setOpen(false);
                  }
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] ${
                  option.code === lang ? "bg-surface-alt font-medium text-navy" : "text-ink-soft"
                } ${option.available ? "hover:bg-surface-alt" : "cursor-not-allowed opacity-50"}`}
              >
                <span>{option.nativeLabel}</span>
                {!option.available && <span className="text-[10px] text-ink-faint">Soon</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
