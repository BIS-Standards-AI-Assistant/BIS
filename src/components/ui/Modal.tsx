"use client";

import { useEffect, useRef } from "react";

/**
 * A generic, focus-trapping popup dialog. Used for showing a single
 * standard's full evidence card without it competing with the centre
 * conversation for permanent screen space (§ source-details-in-popup).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-deep/50 p-4 py-8 backdrop-blur-[2px] sm:py-14"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[760px] rounded-xl border border-border-strong bg-surface shadow-[0_24px_48px_-16px_rgba(4,41,79,0.35)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
          <h2 className="text-sm font-bold text-navy">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-alt hover:text-navy"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
