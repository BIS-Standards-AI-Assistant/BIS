import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceTag } from "./SourceTag";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { WhyPanel } from "./WhyPanel";
import { InsufficientEvidence } from "./InsufficientEvidence";
import { CONFIDENCE, confidenceFromGrounding, PROVENANCE } from "@/lib/provenance";

describe("SourceTag — the data-trust model (§41)", () => {
  test("official evidence and AI interpretation are never styled alike", () => {
    const { container: official } = render(<SourceTag provenance="official" />);
    const { container: ai } = render(<SourceTag provenance="ai" />);
    expect(official.firstElementChild?.className).not.toBe(ai.firstElementChild?.className);
  });

  test("each provenance is distinguishable without colour (§34)", () => {
    // Border style, not just hue, separates them: solid/outline/dashed.
    const classes = (["official", "user", "ai", "inference"] as const).map((p) => {
      const { container } = render(<SourceTag provenance={p} />);
      return container.firstElementChild!.className;
    });
    expect(new Set(classes).size).toBe(4);
    const inference = classes[3];
    expect(inference).toContain("border-dashed");
  });

  test("says what it means, not just what it is", () => {
    render(<SourceTag provenance="ai" />);
    const tag = screen.getByText(PROVENANCE.ai.label);
    expect(tag).toHaveAttribute("aria-label", expect.stringContaining("Check the source"));
  });
});

describe("ConfidenceIndicator — words, not fake precision (§11)", () => {
  test("never renders a percentage", () => {
    for (const level of Object.keys(CONFIDENCE) as (keyof typeof CONFIDENCE)[]) {
      const { container } = render(<ConfidenceIndicator level={level} />);
      expect(container.textContent).not.toMatch(/\d+\s*%/);
    }
  });

  test("explains what the level means rather than leaving it to be guessed", () => {
    render(<ConfidenceIndicator level="likely" />);
    expect(screen.getByText(CONFIDENCE.likely.meaning)).toBeInTheDocument();
  });

  test("insufficient evidence is not dressed up as a weak answer (§10)", () => {
    expect(confidenceFromGrounding("insufficient_evidence")).toBe("insufficient");
    expect(CONFIDENCE.insufficient.meaning).toMatch(/not enough evidence/i);
    // It must not map to anything that reads as a match.
    expect(confidenceFromGrounding("insufficient_evidence")).not.toBe("possible");
  });

  test("pipeline grounding maps onto the reader-facing scale", () => {
    expect(confidenceFromGrounding("verified")).toBe("high");
    expect(confidenceFromGrounding("supported_inference")).toBe("likely");
  });
});

describe("WhyPanel — progressive disclosure (§8, §28)", () => {
  test("shows the plain reason first and hides the technical detail", () => {
    render(
      <WhyPanel reason="Your product is stainless steel and stores drinking water." attributes={[{ attribute: "Material", value: "Stainless steel" }]}>
        <p>clause 4.2</p>
      </WhyPanel>,
    );
    expect(screen.getByText(/stainless steel and stores drinking water/i)).toBeInTheDocument();
    expect(screen.queryByText("clause 4.2")).not.toBeInTheDocument();
  });

  test("expands to the attributes and the evidence, each labelled by provenance", async () => {
    render(
      <WhyPanel reason="Because of the material." attributes={[{ attribute: "Material", value: "Stainless steel" }]}>
        <p>clause 4.2</p>
      </WhyPanel>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /show the reasoning/i }));

    expect(screen.getByText("Stainless steel")).toBeInTheDocument();
    expect(screen.getByText("clause 4.2")).toBeInTheDocument();
    expect(screen.getByText(PROVENANCE.user.label)).toBeInTheDocument();
    expect(screen.getByText(PROVENANCE.official.label)).toBeInTheDocument();
  });

  test("the reasoning is always marked as interpretation, never as source", () => {
    render(<WhyPanel reason="Because of the material." />);
    const header = screen.getByText("Why this applies").closest("div")!;
    expect(within(header).getByText(PROVENANCE.ai.label)).toBeInTheDocument();
  });

  test("offers no disclosure when there is nothing behind it", () => {
    render(<WhyPanel reason="Because of the material." />);
    expect(screen.queryByRole("button", { name: /show the reasoning/i })).not.toBeInTheDocument();
  });
});

describe("InsufficientEvidence — the zero-hallucination state (§10)", () => {
  test("states that nothing was determined and names no standard", () => {
    const { container } = render(<InsufficientEvidence missing={["Operating voltage"]} />);
    expect(screen.getByText(/couldn't determine the applicable standard/i)).toBeInTheDocument();
    // The one thing this component must never do.
    expect(container.textContent).not.toMatch(/\bIS\s?\d{3,}/);
  });

  test("names what is missing and offers to collect it", async () => {
    const onAnswer = vi.fn();
    render(<InsufficientEvidence missing={["Operating voltage", "Material composition"]} onAnswerQuestions={onAnswer} />);

    expect(screen.getByText("Operating voltage")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /answer 2 questions/i }));
    expect(onAnswer).toHaveBeenCalled();
  });

  test("says so honestly when it cannot even identify the gap", () => {
    render(<InsufficientEvidence missing={[]} />);
    expect(screen.getByText(/did not identify a specific gap/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /answer/i })).not.toBeInTheDocument();
  });

  test("always offers the official escalation path", () => {
    render(<InsufficientEvidence missing={[]} />);
    const link = screen.getByRole("link", { name: /BIS technical department/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("bis.gov.in"));
  });
});
