"use client";

import { useRef } from "react";

/**
 * Vertical drag handle for resizing a side panel by its right edge.
 * Purely presentational: it reports a new width and never touches the
 * panel's content or state. Keyboard accessible (←/→ nudge, Home resets)
 * and double-click resets to the default width.
 */
export function PanelResizeHandle({
  minWidth,
  maxWidth,
  reservedWidth,
  onResize,
  onReset,
  label,
}: {
  minWidth: number;
  maxWidth: number;
  /** Width (px) of the surrounding layout that must stay free for other columns. */
  reservedWidth: number;
  onResize: (width: number) => void;
  onReset: () => void;
  label: string;
}) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  // The handle sits inside the panel wrapper, whose parent is the grid.
  const panelOf = (el: HTMLElement) => el.parentElement;
  function clamp(el: HTMLElement, w: number) {
    const gridWidth = panelOf(el)?.parentElement?.clientWidth ?? Infinity;
    const max = Math.max(minWidth, Math.min(maxWidth, gridWidth - reservedWidth));
    return Math.round(Math.min(max, Math.max(minWidth, w)));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startWidth: panelOf(e.currentTarget)?.offsetWidth ?? minWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    onResize(clamp(e.currentTarget, drag.current.startWidth + e.clientX - drag.current.startX));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 48 : 16;
    const width = panelOf(e.currentTarget)?.offsetWidth ?? minWidth;
    if (e.key === "ArrowRight") onResize(clamp(e.currentTarget, width + step));
    else if (e.key === "ArrowLeft") onResize(clamp(e.currentTarget, width - step));
    else if (e.key === "Home") onReset();
    else return;
    e.preventDefault();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className="group absolute inset-y-0 -right-3.5 z-10 flex w-4 cursor-col-resize touch-none justify-center focus:outline-none"
    >
      <span className="h-full w-0.5 rounded-full bg-transparent transition-colors group-hover:bg-navy/40 group-focus-visible:bg-navy group-active:bg-navy" />
    </div>
  );
}
