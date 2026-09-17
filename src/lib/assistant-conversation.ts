/**
 * A standalone assistant conversation. `createAssistantConversation()`
 * builds one independent instance of this; this module's own top-level
 * exports are the instance the Sources panel's prompt box (ResearchChat)
 * and the homepage's inline "Ask a follow-up" thread share — see that
 * component. `general-assistant-conversation.ts` is a second, separate
 * instance for the site-wide floating widget (BisChatBot).
 *
 * Two surfaces asking the SAME question with the SAME scope used to be
 * able to come back with different answers, when each surface tracked its
 * own idea of scope — a real bug for a service whose whole claim is
 * traceable evidence (see git history on this file). The fix was never
 * "one global conversation" as such; it was "one scope, one source of
 * truth, per class of question." ResearchChat and the old docked chat
 * were answering the *same* question (about the current search results)
 * through two different UIs, so they now share one instance. The floating
 * widget answering a *general* question unrelated to whatever's on
 * screen is a different class of question entirely — giving it its own
 * instance doesn't reintroduce that bug, because there is no longer a
 * "same question, two answers" case: a general question was never scoped
 * to current results to begin with.
 */

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  standards?: { number: string | null; title: string; id?: string }[];
  scope?: "current_results" | "global";
  /** Language `text` is actually written in (see ScopedAnswer.answerLanguage / query-pipeline's answerLanguage) — read by SpeakButton, not necessarily the UI toggle. */
  answerLanguage?: string;
  /** Set when the request itself failed, so the UI can style it as an error. */
  failed?: boolean;
}

export interface ConversationState {
  messages: AssistantMessage[];
  pending: boolean;
  /** What the greeting was built for, so it is only rebuilt when that changes. */
  greetingKey: string;
}

export interface SendOptions {
  message: string;
  /** The shared scope — identical for every surface on this instance, decided by one caller. */
  standardNumbers: string[];
  originalQuery: string;
}

const EMPTY: ConversationState = { messages: [], pending: false, greetingKey: "" };

/**
 * Builds one independent conversation store: its own state, its own event
 * name (so instances never cross-notify each other's subscribers), its own
 * id counter. `eventName` must be unique per instance.
 */
export function createAssistantConversation(eventName: string) {
  let state: ConversationState = EMPTY;
  let counter = 0;

  function nextId(prefix: string) {
    counter += 1;
    return `${prefix}-${counter}`;
  }

  function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /** Replaces state wholesale so `getSnapshot` stays referentially stable between changes. */
  function commit(next: ConversationState) {
    state = next;
    try {
      window.dispatchEvent(new Event(eventName));
    } catch {
      /* not in a browser */
    }
  }

  function subscribeToConversation(callback: () => void): () => void {
    window.addEventListener(eventName, callback);
    return () => window.removeEventListener(eventName, callback);
  }

  function getConversationSnapshot(): ConversationState {
    return state;
  }

  /** No conversation exists on the server; rendering one would hydrate-mismatch. */
  function getConversationServerSnapshot(): ConversationState {
    return EMPTY;
  }

  /**
   * Starts the conversation over with a new opening message. `key` is what
   * the greeting depends on (the active query), so switching searches resets
   * the thread while re-rendering does not.
   */
  function resetConversation(greeting: string, key: string) {
    if (state.greetingKey === key && state.messages.length > 0) return;
    commit({
      messages: [{ id: "greeting", sender: "assistant", text: greeting, timestamp: now() }],
      pending: false,
      greetingKey: key,
    });
  }

  /**
   * Sends one message on behalf of whichever surface asked, and appends both
   * it and the reply to this instance's thread. Returns when the reply has landed.
   */
  async function sendAssistantMessage({ message, standardNumbers, originalQuery }: SendOptions): Promise<void> {
    const text = message.trim();
    if (!text || state.pending) return;

    commit({
      ...state,
      pending: true,
      messages: [...state.messages, { id: nextId("user"), sender: "user", text, timestamp: now() }],
    });

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalQuery: originalQuery || text,
          standardNumbers: standardNumbers.slice(0, 10),
          message: text,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const scope: "current_results" | "global" = data.scope === "global" ? "global" : "current_results";

      let messageText: string;
      let standards: { number: string | null; title: string; id?: string }[] = [];
      const answerLanguage: string | undefined = data.answerLanguage;

      if (scope === "global") {
        messageText = `${data.scopeChangeNotice ?? ""}\n\n${data.answer ?? ""}`.trim();
        standards = (data.recommendations ?? [])
          .slice(0, 3)
          .map((r: { standardNumber: string | null; title: string; evidence?: { documentId?: string }[] }) => ({
            number: r.standardNumber,
            title: r.title,
            id: r.evidence?.[0]?.documentId,
          }));
      } else {
        messageText = data.answer ?? "I don't have enough evidence in the current results to establish that.";
        standards = (data.evidence ?? [])
          .slice(0, 3)
          .map((e: { standardNumber: string | null; document: string; documentId: string }) => ({
            number: e.standardNumber,
            title: e.document,
            id: e.documentId,
          }));
      }

      commit({
        ...state,
        pending: false,
        messages: [
          ...state.messages,
          {
            id: nextId("assistant"),
            sender: "assistant",
            text: messageText,
            standards: standards.length > 0 ? standards : undefined,
            scope,
            answerLanguage,
            timestamp: now(),
          },
        ],
      });
    } catch {
      commit({
        ...state,
        pending: false,
        messages: [
          ...state.messages,
          {
            id: nextId("error"),
            sender: "assistant",
            text: "I am temporarily unable to consult the Bureau knowledge base. Please verify your connection or try again in a moment.",
            timestamp: now(),
            failed: true,
          },
        ],
      });
    }
  }

  /** Exposed for tests — clears this instance's thread between cases. */
  function __resetConversationForTests() {
    state = EMPTY;
    counter = 0;
  }

  return {
    subscribeToConversation,
    getConversationSnapshot,
    getConversationServerSnapshot,
    resetConversation,
    sendAssistantMessage,
    __resetConversationForTests,
  };
}

/**
 * The scoped instance — shared by ResearchChat (the homepage's inline
 * "Ask a follow-up" thread) and, historically, the docked chat. Kept as
 * this module's top-level exports so existing importers (ResearchChat,
 * its tests) need no changes.
 */
const scopedConversation = createAssistantConversation("bis-conversation-updated");

export const subscribeToConversation = scopedConversation.subscribeToConversation;
export const getConversationSnapshot = scopedConversation.getConversationSnapshot;
export const getConversationServerSnapshot = scopedConversation.getConversationServerSnapshot;
export const resetConversation = scopedConversation.resetConversation;
export const sendAssistantMessage = scopedConversation.sendAssistantMessage;
export const __resetConversationForTests = scopedConversation.__resetConversationForTests;
