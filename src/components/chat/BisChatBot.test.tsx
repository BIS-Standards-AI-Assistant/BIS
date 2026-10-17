import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BisChatBot } from "./BisChatBot";
import { __resetConversationForTests } from "@/lib/general-assistant-conversation";

beforeEach(() => {
  __resetConversationForTests();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

function chatReply(body: Record<string, unknown>) {
  return { ok: true, json: async () => body };
}

describe("BisChatBot — site-wide, with no search context", () => {
  // app/layout.tsx mounts it with no props, on every page.
  test("is labelled as the general assistant, not as a discussion of results", async () => {
    render(<BisChatBot />);
    const launcher = screen.getByRole("button", { name: "Ask BIS Assistant" });
    await userEvent.setup().click(launcher);
    const dialog = screen.getByRole("dialog", { name: "Ask BIS Assistant" });
    expect(within(dialog).queryByText(/Discuss these results/i)).not.toBeInTheDocument();
  });

  test("suggests questions it can answer, not ones about 'the first result'", async () => {
    render(<BisChatBot />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Ask BIS Assistant" }));
    expect(screen.getByRole("button", { name: "Which standard applies to packaged drinking water?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "What makes the first result relevant?" })).not.toBeInTheDocument();
  });

  test("a suggested question is sent to the chat API as the message", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(chatReply({ scope: "global", answer: "IS 14543 covers it.", recommendations: [] }));
    vi.stubGlobal("fetch", fetchSpy);
    render(<BisChatBot />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ask BIS Assistant" }));
    await user.click(screen.getByRole("button", { name: "What does IS 1293 cover?" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toMatchObject({ message: "What does IS 1293 cover?", standardNumbers: [] });
  });
});

describe("BisChatBot — discussing a search", () => {
  test("is labelled for the results and offers results questions", async () => {
    render(<BisChatBot currentQuery="steel water bottle" standardNumbers={["IS 14543:2016"]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Discuss these results" }));
    const dialog = screen.getByRole("dialog", { name: "Discuss these results" });
    expect(within(dialog).getByText('Discussing: "steel water bottle"')).toBeInTheDocument();
    expect(within(dialog).getByText("Scope: 1 standard")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "What makes the first result relevant?" })).toBeInTheDocument();
  });
});

describe("BisChatBot — accessibility", () => {
  test("the question box has a name and the window can be closed", async () => {
    render(<BisChatBot />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ask BIS Assistant" }));
    expect(screen.getByRole("textbox", { name: "Your question" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close chat" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("referenced standards without a page are shown as text, not dead '#' links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(chatReply({
      scope: "global",
      answer: "Two standards are relevant.",
      recommendations: [
        { standardNumber: "IS 14543:2016", title: "Packaged Drinking Water", evidence: [{ documentId: "doc-1" }] },
        { standardNumber: "IS 9999:2001", title: "Not indexed", evidence: [] },
      ],
    })));
    render(<BisChatBot />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ask BIS Assistant" }));
    await user.type(screen.getByRole("textbox", { name: "Your question" }), "drinking water{Enter}");

    expect(await screen.findByRole("link", { name: /IS 14543:2016/ })).toHaveAttribute("href", "/standards/doc-1");
    expect(screen.getByText("IS 9999:2001")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /IS 9999:2001/ })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).not.toBe("#");
  });
});
