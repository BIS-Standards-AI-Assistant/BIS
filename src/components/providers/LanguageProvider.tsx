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
  return window.localStorage.getItem(STORAGE_KEY) === "hi" ? "hi" : "en";
}

function getServerSnapshot(): LangCode {
  return "en";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setLang(next: LangCode) {
  window.localStorage.setItem(STORAGE_KEY, next);
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
