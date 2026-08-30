"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { DICTIONARIES, LANGUAGES, type Dictionary, type LangCode } from "@/lib/i18n";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "bis-lang";
const listeners = new Set<() => void>();

function getSnapshot(): LangCode {
  // Browsers throw on storage access in private mode or when site data is
  // blocked. This runs inside useSyncExternalStore during render, so an
  // uncaught throw takes down every page that renders a LanguageProvider.
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

function getServerSnapshot(): LangCode {
  return "en";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setLang(next: LangCode) {
  // Persisting the choice is best-effort; the language still switches for this
  // session when storage is unavailable.
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignored — see getSnapshot
  }
  listeners.forEach((l) => l());
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LanguageContext.Provider value={{ lang, setLang, t: DICTIONARIES[lang] }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export { LANGUAGES };
