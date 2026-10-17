import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PanelResizeHandle } from "./PanelResizeHandle";

// jsdom has no layout. Give elements the sizes their data attributes declare:
// data-w → offsetWidth (the panel), data-cw → clientWidth (the grid).
const originals = {
  offsetWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth"),
  clientWidth: Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth"),
};
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return Number((this as HTMLElement).dataset.w ?? 0);
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return Number((this as HTMLElement).dataset.cw ?? 0);
    },
  });
});
afterAll(() => {
  if (originals.offsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", originals.offsetWidth);
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

function renderHandle({ panel = 330, grid = 1400 }: { panel?: number; grid?: number } = {}) {
  const onResize = vi.fn();
  const onReset = vi.fn();
  render(
    <div data-cw={grid}>
      <div data-w={panel}>
        <PanelResizeHandle label="Resize sources panel" minWidth={260} maxWidth={760} reservedWidth={820} onResize={onResize} onReset={onReset} />
      </div>
    </div>,
  );
  return { handle: screen.getByRole("separator", { name: "Resize sources panel" }), onResize, onReset };
}

describe("PanelResizeHandle", () => {
  test("is a focusable vertical separator that reports its range and current width", () => {
    const { handle } = renderHandle();
    expect(handle).toHaveAttribute("tabindex", "0");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuemin", "260");
    expect(handle).toHaveAttribute("aria-valuemax", "760");
    expect(handle).toHaveAttribute("aria-valuenow", "330");
    expect(handle).toHaveAttribute("aria-valuetext", "330 pixels wide");
  });

  test("arrow keys nudge by 16px, or 48px with Shift, and the reported value follows", () => {
    const { handle, onResize } = renderHandle();
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onResize).toHaveBeenLastCalledWith(346);
    expect(handle).toHaveAttribute("aria-valuenow", "346");
    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    expect(onResize).toHaveBeenLastCalledWith(282);
  });

  test("never goes below the minimum width", () => {
    const { handle, onResize } = renderHandle({ panel: 270 });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(onResize).toHaveBeenLastCalledWith(260);
  });

  test("never takes the space the other columns need", () => {
    // 1400px grid - 820px reserved = 580px, under the 760px maximum.
    const { handle, onResize } = renderHandle({ panel: 570 });
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    expect(onResize).toHaveBeenLastCalledWith(580);
  });

  test("Home and double-click reset to the default width", () => {
    const { handle, onReset } = renderHandle();
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.doubleClick(handle);
    expect(onReset).toHaveBeenCalledTimes(2);
  });

  test("other keys are left alone", () => {
    const { handle, onResize, onReset } = renderHandle();
    const event = fireEvent.keyDown(handle, { key: "Tab" });
    expect(event).toBe(true); // not prevented — focus can move on
    expect(onResize).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });
});
