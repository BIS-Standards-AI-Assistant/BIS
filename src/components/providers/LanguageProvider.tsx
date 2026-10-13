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

function isLangCode(value: unknown): value is LangCode {
  return typeof value === "string" && Object.hasOwn(DICTIONARIES, value);
}

/**
 * The choice made in this tab. localStorage can be unavailable or refuse
 * writes (private browsing, blocked site data, a full quota); without this
 * the snapshot re-read the old stored value and the switch silently did
 * nothing. Persisting is best-effort; switching must always work.
 */
let chosenLang: LangCode | null = null;

function getSnapshot(): LangCode {
  if (chosenLang) return chosenLang;
  try {
    const val = window.localStorage.getItem(STORAGE_KEY);
    return isLangCode(val) ? val : "en";
  } catch {
    return "en";
  }
}

function getServerSnapshot(): LangCode {
  return "en";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Another tab changed the language: follow it, as the stored value would
  // on the next page load anyway.
  function onStorage(e: StorageEvent) {
    if (e.key !== STORAGE_KEY || !isLangCode(e.newValue)) return;
    chosenLang = e.newValue;
    callback();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function setLang(next: LangCode) {
  chosenLang = next;
  // Each store is attempted independently, so a refused localStorage write
  // doesn't also skip the cookie the server reads.
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // best-effort
  }
  try {
    document.cookie = `${STORAGE_KEY}=${next};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    // best-effort
  }
  listeners.forEach((l) => l());
}

/** Exposed for tests only — forgets the in-tab choice between cases. */
export function __resetLanguageForTests(): void {
  chosenLang = null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const dictionary = DICTIONARIES[lang] ?? DICTIONARIES.en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dictionary }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export { LANGUAGES };
