import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoiceSearchButton } from "./VoiceSearchButton";

describe("VoiceSearchButton Component", () => {
  test("renders with accessible label in idle state", () => {
    const onTranscript = vi.fn();
    render(<VoiceSearchButton onTranscript={onTranscript} />);

    const button = screen.getByRole("button", { name: /start voice search/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  test("disables button when disabled prop is passed", () => {
    const onTranscript = vi.fn();
    render(<VoiceSearchButton onTranscript={onTranscript} disabled={true} />);

    const button = screen.getByRole("button", { name: /start voice search/i });
    expect(button).toBeDisabled();
  });

  test("includes aria-live status container for screen reader announcements", () => {
    const onTranscript = vi.fn();
    const { container } = render(<VoiceSearchButton onTranscript={onTranscript} />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent(/start voice search/i);
  });
});
