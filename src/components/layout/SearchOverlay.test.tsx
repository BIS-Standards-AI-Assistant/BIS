import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchOverlay } from "./SearchOverlay";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockClear();
});

describe("SearchOverlay", () => {
  test("renders nothing when closed", () => {
    render(<SearchOverlay open={false} onClose={() => {}} />);
    expect(screen.queryByPlaceholderText("Search BIS Standards, Services & Documents")).not.toBeInTheDocument();
  });

  test("renders the search input, example, and category chips when open", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    expect(screen.getByPlaceholderText("Search BIS Standards, Services & Documents")).toBeInTheDocument();
    expect(screen.getByText("Try asking")).toBeInTheDocument();
    for (const chip of ["Standards", "Certification", "Testing", "Services"]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });

  test("never labels itself as an AI chat interface", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    expect(screen.queryByText(/chat with ai/i)).not.toBeInTheDocument();
  });

  test("submitting a typed query navigates to /search?q=<query> and closes the overlay", () => {
    const onClose = vi.fn();
    render(<SearchOverlay open onClose={onClose} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.change(input, { target: { value: "IS 5522:2014" } });
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).toHaveBeenCalledWith("/search?q=IS%205522%3A2014");
    expect(onClose).toHaveBeenCalled();
  });

  test("clicking a category chip navigates using the chip's own label as the query", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    fireEvent.click(screen.getByText("Certification"));
    expect(pushMock).toHaveBeenCalledWith("/search?q=Certification");
  });

  test("submitting an empty query does not navigate", () => {
    render(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Search BIS Standards, Services & Documents");
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("the close button calls onClose", () => {
    const onClose = vi.fn();
    render(<SearchOverlay open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close search"));
    expect(onClose).toHaveBeenCalled();
  });

  test("Escape key calls onClose", () => {
    const onClose = vi.fn();
    render(<SearchOverlay open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
