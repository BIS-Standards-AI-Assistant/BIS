import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createAssistantConversation } from "./assistant-conversation";

/** A fetch whose reply the test releases by hand, to control ordering. */
function heldFetch() {
  const pending: Array<{ resolve: (r: Response) => void; reject: (e: unknown) => void }> = [];
  const fn = vi.fn(
    () => new Promise<Response>((resolve, reject) => pending.push({ resolve, reject })),
  );
  const reply = (i: number, answer: string) =>
    pending[i].resolve({ ok: true, json: async () => ({ scope: "current_results", answer, evidence: [] }) } as Response);
  const fail = (i: number) => pending[i].reject(new TypeError("Failed to fetch"));
  return { fn, reply, fail };
}

let convo: ReturnType<typeof createAssistantConversation>;

beforeEach(() => {
  convo = createAssistantConversation(`test-conversation-${Math.random()}`);
});

afterEach(() => vi.unstubAllGlobals());

const texts = () => convo.getConversationSnapshot().messages.map((m) => `${m.sender}:${m.text}`);

describe("a reply that lands after the thread was reset", () => {
  test("is discarded rather than appended to the new search's thread", async () => {
    const f = heldFetch();
    vi.stubGlobal("fetch", f.fn);
    convo.resetConversation("About plastic bottles", "plastic bottle");

    const sending = convo.sendAssistantMessage({ message: "What tests apply?", standardNumbers: ["IS 15410"], originalQuery: "plastic bottle" });
    convo.resetConversation("About cement", "cement");
    f.reply(0, "Migration testing applies to IS 15410.");
    await sending;

    expect(texts()).toEqual(["assistant:About cement"]);
    expect(convo.getConversationSnapshot().pending).toBe(false);
  });

  test("a failure from the old thread is not shown in the new one either", async () => {
    const f = heldFetch();
    vi.stubGlobal("fetch", f.fn);
    convo.resetConversation("About plastic bottles", "plastic bottle");

    const sending = convo.sendAssistantMessage({ message: "What tests apply?", standardNumbers: [], originalQuery: "plastic bottle" });
    convo.resetConversation("About cement", "cement");
    f.fail(0);
    await sending;

    expect(convo.getConversationSnapshot().messages.some((m) => m.failed)).toBe(false);
  });

  test("does not clear the pending state of a question asked in the new thread", async () => {
    const f = heldFetch();
    vi.stubGlobal("fetch", f.fn);
    convo.resetConversation("About plastic bottles", "plastic bottle");

    const first = convo.sendAssistantMessage({ message: "Old question", standardNumbers: [], originalQuery: "plastic bottle" });
    convo.resetConversation("About cement", "cement");
    const second = convo.sendAssistantMessage({ message: "New question", standardNumbers: [], originalQuery: "cement" });

    f.reply(0, "Old answer");
    await first;
    expect(convo.getConversationSnapshot().pending).toBe(true);

    f.reply(1, "New answer");
    await second;
    expect(texts()).toEqual(["assistant:About cement", "user:New question", "assistant:New answer"]);
    expect(convo.getConversationSnapshot().pending).toBe(false);
  });

  test("resetting with the same key keeps the thread, so its reply still lands", async () => {
    const f = heldFetch();
    vi.stubGlobal("fetch", f.fn);
    convo.resetConversation("About cement", "cement");

    const sending = convo.sendAssistantMessage({ message: "Which grade?", standardNumbers: [], originalQuery: "cement" });
    convo.resetConversation("About cement", "cement"); // a re-render, not a new search
    f.reply(0, "OPC 53 is covered by IS 269.");
    await sending;

    expect(texts()).toEqual(["assistant:About cement", "user:Which grade?", "assistant:OPC 53 is covered by IS 269."]);
  });
});
