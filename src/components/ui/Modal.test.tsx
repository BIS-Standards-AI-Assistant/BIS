import { describe, expect, test, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

/** An opener button plus a modal, the way HomeClient uses it. */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open evidence</button>
      {open && (
        // An inline onClose, as real callers pass.
        <Modal open onClose={() => setOpen(false)} title="IS 15410:2003">
          <a href="#clause">Clause 4.1</a>
          <button>Copy citation</button>
        </Modal>
      )}
    </div>
  );
}

describe("Modal", () => {
  test("moves focus into the dialog on open", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open evidence" }));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  test("Tab and Shift+Tab cycle within the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open evidence" }));

    await user.tab();
    expect(screen.getByRole("link", { name: "Clause 4.1" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Copy citation" })).toHaveFocus();
    await user.tab(); // wraps, rather than escaping to the page behind
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab({ shift: true }); // and back
    expect(screen.getByRole("button", { name: "Copy citation" })).toHaveFocus();
  });

  test("Escape closes it and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open evidence" });
    await user.click(opener);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  test("the close button also returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open evidence" });
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(opener).toHaveFocus();
  });

  test("clicking the backdrop closes it, clicking inside does not", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open evidence" }));

    await user.click(screen.getByRole("link", { name: "Clause 4.1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("locks page scroll while open and restores it after", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "auto";
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open evidence" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("auto");
  });

  test("a parent re-render does not pull focus back to the close button", async () => {
    // Each render passes a new inline onClose, exactly as HomeClient does.
    const modal = () => (
      <Modal open onClose={() => {}} title="Evidence">
        <button>Copy citation</button>
      </Modal>
    );
    const user = userEvent.setup();
    const { rerender } = render(modal());
    await user.tab();
    expect(screen.getByRole("button", { name: "Copy citation" })).toHaveFocus();

    // e.g. a chat reply landing in HomeClient while the modal is open
    rerender(modal());
    expect(screen.getByRole("button", { name: "Copy citation" })).toHaveFocus();
  });

  test("exposes an accessible modal dialog named by its title", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open evidence" }));
    const dialog = screen.getByRole("dialog", { name: "IS 15410:2003" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("renders nothing when closed", () => {
    render(<Modal open={false} onClose={vi.fn()} title="x">body</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
