import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResearchChat } from "./ResearchChat";
import { __resetConversationForTests, getConversationSnapshot } from "@/lib/assistant-conversation";

const SCOPE = ["IS 15410:2003"];

function chatResponse(answer: string, evidence: unknown[] = []) {
  return { ok: true, json: async () => ({ scope: "current_results", answer, evidence }) };
}

function renderChat(over: Partial<Parameters<typeof ResearchChat>[0]> = {}) {
  const props = {
    scopeStandardNumbers: SCOPE,
    scopeQuery: "plastic bottle",
    hasSelectedSources: true,
    onManageSources: vi.fn(),
    ...over,
  };
  return { ...render(<ResearchChat {...props} />), props };
}

beforeEach(() => {
  __resetConversationForTests();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

describe("§3/§26 — the centre is a chat, not a second search box", () => {
  test("its control says Send, and its placeholder asks for a follow-up", () => {
    renderChat();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask a follow-up about these standards/i)).toBeInTheDocument();
    // The affordance this replaced must not linger.
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  test("asking calls the conversational endpoint, never the query pipeline", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(chatResponse("Indexed evidence identifies migration testing."));
    vi.stubGlobal("fetch", fetchSpy);

    renderChat();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/ask a follow-up/i), "What are the testing requirements?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/v1/chat");
    // §5: a follow-up must not start a new global search.
    expect(fetchSpy.mock.calls.every((c) => c[0] !== "/api/v1/query")).toBe(true);
  });

  test("Enter sends and Shift+Enter does not", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(chatResponse("ok"));
    vi.stubGlobal("fetch", fetchSpy);
    renderChat();
    const user = userEvent.setup();
    const box = screen.getByLabelText(/ask a follow-up/i);

    await user.type(box, "line one{Shift>}{Enter}{/Shift}");
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.type(box, "{Enter}");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  });
});

describe("§7/§18 — the question is scoped to the selected sources", () => {
  test("sends the scope it was given, with the original research query", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(chatResponse("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    renderChat();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/ask a follow-up/i), "What tests apply?{Enter}");

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.standardNumbers).toEqual(SCOPE);
    expect(body.originalQuery).toBe("plastic bottle");
  });

  test("shows which sources are in context (§28)", () => {
    renderChat({ scopeStandardNumbers: ["IS 15410:2003", "IS 14543:2016"] });
    expect(screen.getByText(/Research context · 2 BIS sources/i)).toBeInTheDocument();
    expect(screen.getByText("IS 15410:2003")).toBeInTheDocument();
  });

  test("Manage sources opens the left panel", async () => {
    const { props } = renderChat();
    await userEvent.setup().click(screen.getByRole("button", { name: /manage sources/i }));
    expect(props.onManageSources).toHaveBeenCalled();
  });
});

describe("§27/§8 — one continuous conversation", () => {
  test("both turns stay on screen, in order", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(chatResponse("Migration testing is identified."))
      .mockResolvedValueOnce(chatResponse("Yes, under a Quality Control Order.")));

    renderChat();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/ask a follow-up/i), "What are the testing requirements?{Enter}");
    expect(await screen.findByText(/Migration testing is identified/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/ask a follow-up/i), "Is certification mandatory?{Enter}");
    expect(await screen.findByText(/under a Quality Control Order/)).toBeInTheDocument();

    // The first exchange survives the second — §8's conversation memory.
    expect(screen.getByText("What are the testing requirements?")).toBeInTheDocument();
    expect(screen.getByText(/Migration testing is identified/)).toBeInTheDocument();
    expect(getConversationSnapshot().messages.filter((m) => m.sender === "user")).toHaveLength(2);
  });

  test("an assistant answer is labelled as interpretation, not as source (§13)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(chatResponse("An answer.")));
    renderChat();
    await userEvent.setup().type(screen.getByLabelText(/ask a follow-up/i), "why?{Enter}");

    await screen.findByText("An answer.");
    expect(screen.getByText("AI interpretation")).toBeInTheDocument();
  });

  test("evidence standards are shown with the answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      chatResponse("From the indexed evidence.", [{ standardNumber: "IS 15410:2003", document: "Manual", documentId: "d1" }]),
    ));
    renderChat();
    await userEvent.setup().type(screen.getByLabelText(/ask a follow-up/i), "evidence?{Enter}");

    await screen.findByText("From the indexed evidence.");
    expect(screen.getByText(/Evidence from/i)).toBeInTheDocument();
  });
});

describe("§25/§29 — honest states", () => {
  test("while working it says it is reading sources, not searching", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
    renderChat();
    await userEvent.setup().type(screen.getByLabelText(/ask a follow-up/i), "q{Enter}");

    expect(await screen.findByRole("status")).toHaveTextContent(/reading selected bis sources/i);
    expect(screen.queryByText(/^searching/i)).not.toBeInTheDocument();
  });

  test("with no sources it says to select some, rather than inviting a blind question", () => {
    renderChat({ scopeStandardNumbers: [], hasSelectedSources: false });
    expect(screen.getByText(/search and select BIS sources on the left/i)).toBeInTheDocument();
    expect(screen.getByText(/Research context · none selected/i)).toBeInTheDocument();
  });

  test("a failed answer is shown as a failure, not as evidence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderChat();
    await userEvent.setup().type(screen.getByLabelText(/ask a follow-up/i), "q{Enter}");

    expect(await screen.findByText(/temporarily unable to consult/i)).toBeInTheDocument();
    expect(screen.queryByText("AI interpretation")).not.toBeInTheDocument();
  });
});
