import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchemeDecisionTree } from "./SchemeDecisionTree";

describe("SchemeDecisionTree Component", () => {
  test("renders Step 1 initially with domestic and foreign options", () => {
    render(<SchemeDecisionTree mode="inline" />);

    expect(screen.getByText("Where is your product manufactured?")).toBeInTheDocument();
    expect(screen.getByText("Domestic (Manufactured inside India)")).toBeInTheDocument();
    expect(screen.getByText("Foreign (Importing into India)")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  test("Step 1 -> Foreign routes directly to Scheme-IV (FMCS) result card", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    await user.click(screen.getByText("Foreign (Importing into India)"));

    expect(screen.getByText("Scheme-IV (FMCS)")).toBeInTheDocument();
    expect(
      screen.getByText("Foreign Manufacturers Certification Scheme (FMCS) — ISI Mark"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nominated Authorized Indian Representative/i)).toBeInTheDocument();

    const portalLink = screen.getByRole("link", { name: /manakonline/i });
    expect(portalLink).toHaveAttribute("href", "https://www.manakonline.in");
    expect(portalLink).toHaveAttribute("target", "_blank");
  });

  test("Step 1 Domestic -> Step 2 Electronics routes to Scheme-II (CRS) with crsbis.in link", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    await user.click(screen.getByText("Domestic (Manufactured inside India)"));
    expect(screen.getByText("Select Product Category")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();

    await user.click(screen.getByText("IT Hardware, Laptops, Mobile Handsets, or Solar PV"));

    expect(screen.getByText("Scheme-II (CRS)")).toBeInTheDocument();
    expect(screen.getByText(/Compulsory Registration Scheme/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Self-Declaration of Conformity/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/80% concession/i)).toBeInTheDocument();

    const portalLink = screen.getByRole("link", { name: /crsbis\.in/i });
    expect(portalLink).toHaveAttribute("href", "https://www.crsbis.in");
  });

  test("Step 1 Domestic -> Step 2 Jewellery routes to BIS Hallmarking (HUID)", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    await user.click(screen.getByText("Domestic (Manufactured inside India)"));
    await user.click(screen.getByText("Gold or Silver Jewellery & Artefacts"));

    expect(screen.getByText("BIS Hallmarking (HUID)")).toBeInTheDocument();
    expect(screen.getByText(/Mandatory Hallmarking Scheme/i)).toBeInTheDocument();
    expect(screen.getAllByText(/HUID/i).length).toBeGreaterThan(0);
  });

  test("Step 1 Domestic -> Step 2 General Goods routes to Voluntary / No QCO", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    await user.click(screen.getByText("Domestic (Manufactured inside India)"));
    await user.click(screen.getByText("Textiles, Furniture, or General Unregulated Consumer Goods"));

    expect(screen.getByText("Voluntary Certification / No QCO")).toBeInTheDocument();
    expect(screen.getByText(/Voluntary Standard Compliance/i)).toBeInTheDocument();
  });

  test("Step 1 Domestic -> Step 2 Industrial -> Step 3 In-House Lab routes to Scheme-I Standard Procedure", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    await user.click(screen.getByText("Domestic (Manufactured inside India)"));
    await user.click(
      screen.getByText("Industrial Products, Pressure Cookers, Helmets, Steel, Cement, or Electrical Appliances"),
    );

    expect(screen.getByText(/Do you have an in-house factory testing laboratory/i)).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();

    await user.click(screen.getByText("Yes, we have full in-house testing equipment"));

    expect(screen.getByText("Scheme-I (ISI Mark) — Standard Route")).toBeInTheDocument();
    expect(screen.getByText(/Preliminary Factory Audit by BIS Technical Officers/i)).toBeInTheDocument();
    expect(screen.getByText(/80% fee discount for Micro-enterprises and Startups/i)).toBeInTheDocument();
  });

  test("Step 1 Domestic -> Step 2 Industrial -> Step 3 MSME Third-Party routes to Scheme-I Simplified Fast-Track", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    await user.click(screen.getByText("Domestic (Manufactured inside India)"));
    await user.click(
      screen.getByText("Industrial Products, Pressure Cookers, Helmets, Steel, Cement, or Electrical Appliances"),
    );

    await user.click(screen.getByText("No, we are an MSME relying on third-party test reports"));

    expect(screen.getByText("Scheme-I (ISI Mark) — Simplified Fast-Track")).toBeInTheDocument();
    expect(screen.getByText(/Scheme-I Simplified Procedure — Fast-Track for MSMEs/i)).toBeInTheDocument();
    expect(screen.getByText(/Pre-testing of sample at BIS-approved or NABL-accredited/i)).toBeInTheDocument();
  });

  test("Back button allows user to go back to previous steps", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    // Step 1 -> Step 2
    await user.click(screen.getByText("Domestic (Manufactured inside India)"));
    expect(screen.getByText("Select Product Category")).toBeInTheDocument();

    // Go back to Step 1
    await user.click(screen.getByText(/Back to Origin/i));
    expect(screen.getByText("Where is your product manufactured?")).toBeInTheDocument();

    // Go to Step 2 -> Step 3
    await user.click(screen.getByText("Domestic (Manufactured inside India)"));
    await user.click(
      screen.getByText("Industrial Products, Pressure Cookers, Helmets, Steel, Cement, or Electrical Appliances"),
    );
    expect(screen.getByText(/Do you have an in-house factory testing laboratory/i)).toBeInTheDocument();

    // Go back to Step 2
    await user.click(screen.getByText(/Back to Categories/i));
    expect(screen.getByText("Select Product Category")).toBeInTheDocument();
  });

  test("Restart Wizard button resets the wizard to Step 1", async () => {
    const user = userEvent.setup();
    render(<SchemeDecisionTree mode="inline" />);

    await user.click(screen.getByText("Foreign (Importing into India)"));
    expect(screen.getByText("Scheme-IV (FMCS)")).toBeInTheDocument();

    await user.click(screen.getByText(/Restart Wizard/i));
    expect(screen.getByText("Where is your product manufactured?")).toBeInTheDocument();
    expect(screen.queryByText("Scheme-IV (FMCS)")).not.toBeInTheDocument();
  });

  test("Modal mode behaves correctly when open and closed", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <SchemeDecisionTree mode="modal" isOpen={false} onClose={onClose} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<SchemeDecisionTree mode="modal" isOpen={true} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Close wizard dialog")).toBeInTheDocument();

    // Close via close button
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Close wizard dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Close via Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
