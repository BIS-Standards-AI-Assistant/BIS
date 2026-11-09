"use client";

import { useSyncExternalStore } from "react";

const DISMISSED_KEY = "bis-openrouter-key-notice-dismissed";
const NOTICE_EVENT = "bis-openrouter-key-notice-change";

function subscribeToDismissal(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(NOTICE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(NOTICE_EVENT, onStoreChange);
  };
}

function getDismissedSnapshot() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function OpenRouterKeyNotice({ hasKey }: { hasKey: boolean }) {
  const dismissed = useSyncExternalStore(subscribeToDismissal, getDismissedSnapshot, () => false);
  const visible = !dismissed;

  if (hasKey || !visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Dismissal still works for this session when storage is unavailable.
    }
    window.dispatchEvent(new Event(NOTICE_EVENT));
  }

  return (
    <div className="fixed inset-x-4 top-4 z-[60] sm:left-auto sm:right-6 sm:w-[min(440px,calc(100vw-3rem))]">
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-gold/70 border-t-4 bg-surface-raised p-4 shadow-[0_18px_45px_-18px_rgba(4,41,79,0.45)]"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink" aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold tracking-tight text-navy">Enable BIS Assistant reasoning</p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss OpenRouter key notification"
                className="-mr-1 -mt-1 rounded p-1 text-ink-faint hover:bg-surface-alt hover:text-navy"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-[13px] leading-5 text-ink-soft">
              Add <code className="rounded bg-surface-alt px-1 py-0.5 font-mono text-[12px] text-navy">OPENROUTER_API_KEY</code> to <code className="rounded bg-surface-alt px-1 py-0.5 font-mono text-[12px] text-navy">.env.local</code> to enable hosted reasoning and model fallback for the assistant.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-bold text-blue underline decoration-blue/40 underline-offset-2 hover:text-navy"
              >
                Get an OpenRouter key
              </a>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-md border border-border-strong px-2.5 py-1 text-[12px] font-semibold text-ink-soft hover:border-blue hover:text-blue"
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
