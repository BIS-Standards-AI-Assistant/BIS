"use client";

/**
 * A draggable divider between two workspace columns, NotebookLM-style.
 * Purely presentational + pointer-event plumbing — the caller owns the
 * actual width state and clamping, this just reports a delta in pixels.
 */
export function ResizeHandle({
  onResize,
  label,
  visibleFrom,
}: {
  /** Called continuously while dragging, with the horizontal movement since the last call. */
  onResize: (deltaPx: number) => void;
  /** For screen readers / the visible tooltip — which boundary this resizes. */
  label: string;
  /** Matches the breakpoint the panel it resizes appears at — a handle with nothing beside it to resize is worse than no handle. */
  visibleFrom: "lg" | "xl";
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    let lastX = e.clientX;

    function onPointerMove(ev: PointerEvent) {
      const deltaX = ev.clientX - lastX;
      lastX = ev.clientX;
      onResize(deltaX);
    }
    function onPointerUp(ev: PointerEvent) {
      handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
    }
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      className={`group relative hidden w-2 shrink-0 cursor-col-resize touch-none select-none ${visibleFrom === "lg" ? "lg:block" : "xl:block"}`}
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70 transition-colors group-hover:bg-navy group-active:bg-navy" />
    </div>
  );
}
