import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClarificationPanel } from "./ClarificationPanel";

const ITEMS = ["Stainless Steel 304", "Vacuum Insulated", "750 ml"];

function renderPanel(props: Partial<Parameters<typeof ClarificationPanel>[0]> = {}) {
  const onRefine = vi.fn();
  const utils = render(
    <ClarificationPanel items={ITEMS} product="steel water bottle" currentQuery="steel water bottle" onRefine={onRefine} {...props} />,
  );
  return { ...utils, onRefine };
}

describe("ClarificationPanel", () => {
  test("shows the supplied specifications as toggle chips", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Recommended specifications for Steel water bottle" })).toBeInTheDocument();
    for (const item of ITEMS) expect(screen.getByRole("button", { name: new RegExp(item) })).toHaveAttribute("aria-pressed", "false");
  });

  test("generic placeholders are never offered; product-specific options are used instead", () => {
    renderPanel({ items: ["intended use", "material grade"], currentQuery: "helmet", product: "helmet" });
    expect(screen.queryByRole("button", { name: /intended use/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /IS 4151/ })).toBeInTheDocument();
  });

  test("Refine Search runs the combined query immediately — no staged animation first", async () => {
    const { onRefine } = renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Stainless Steel 304/ }));
    await user.click(screen.getByRole("button", { name: /750 ml/ }));
    await user.click(screen.getByRole("button", { name: /Refine Search/ }));
    expect(onRefine).toHaveBeenCalledTimes(1);
    expect(onRefine).toHaveBeenCalledWith("steel water bottle Stainless Steel 304 750 ml");
    expect(screen.queryByText(/cross-referencing|Synthesizing|Combining inputs/i)).not.toBeInTheDocument();
  });

  test("a typed specification replaces the suggested one", async () => {
    const { onRefine } = renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /750 ml/ }));
    await user.type(screen.getByRole("textbox", { name: "Specification for 750 ml" }), "1 litre");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: /Refine Search/ }));
    expect(onRefine).toHaveBeenCalledWith("steel water bottle 1 litre");
  });

  test("a selected specification can be removed by name", async () => {
    renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Vacuum Insulated/ }));
    await user.click(screen.getByRole("button", { name: "Close input" }));
    await user.click(screen.getByRole("button", { name: "Remove Vacuum Insulated" }));
    expect(screen.queryByRole("button", { name: /Refine Search/ })).not.toBeInTheDocument();
  });

  test("while the real search runs, the status says what is happening and with which specs", async () => {
    const { rerender, onRefine } = renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Stainless Steel 304/ }));
    rerender(<ClarificationPanel items={ITEMS} product="steel water bottle" currentQuery="steel water bottle" onRefine={onRefine} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Searching with your refined specifications…");
    expect(screen.getByRole("status")).toHaveTextContent("Stainless Steel 304");
    expect(screen.queryByRole("button", { name: /Refine Search/ })).not.toBeInTheDocument();
  });

  test("collapsed, it summarises the selection and expands on request", async () => {
    const onToggleCollapse = vi.fn();
    renderPanel({ collapsed: true, onToggleCollapse });
    const summary = screen.getByRole("button", { expanded: false });
    expect(summary).toHaveTextContent("3 recommended specifications for Steel water bottle");
    await userEvent.setup().click(summary);
    expect(onToggleCollapse).toHaveBeenCalled();
  });
});
