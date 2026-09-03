/**
 * The single assistant conversation, shared by every surface that talks to
 * it — the docked chat and the Sources panel's prompt box.
 *
 * Both used to keep their own message list and, worse, send their own idea
 * of scope: the Sources box asked about the added documents only, the chat
 * asked about the search results plus the documents. The same question put
 * to the two could therefore come back with different answers, which in a
 * service whose whole claim is traceable evidence is not a cosmetic
 * problem. There is now one conversation and one scope, and a message sent
 * from either surface appears in both.
 *
 * Scope is passed in by the caller rather than read here, so there is
 * exactly one place (HomeClient) that decides what the assistant knows:
 * the standards from the current results, plus those cited by the selected
 * source documents. Identifiers only — the server resolves the facts from
 * the database, per src/lib/chat-context.ts.
 */

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  standards?: { number: string | null; title: string; id?: string }[];
  scope?: "current_results" | "global";
  /** Set when the request itself failed, so the UI can style it as an error. */
  failed?: boolean;
}

export interface ConversationState {
  messages: AssistantMessage[];
  pending: boolean;
  /** What the greeting was built for, so it is only rebuilt when that changes. */
  greetingKey: string;
}

const EVENT = "bis-conversation-updated";

const EMPTY: ConversationState = { messages: [], pending: false, greetingKey: "" };

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
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* not in a browser */
  }
}

export function subscribeToConversation(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function getConversationSnapshot(): ConversationState {
  return state;
}

/** No conversation exists on the server; rendering one would hydrate-mismatch. */
export function getConversationServerSnapshot(): ConversationState {
  return EMPTY;
}

/**
 * Starts the conversation over with a new opening message. `key` is what
 * the greeting depends on (the active query), so switching searches resets
 * the thread while re-rendering does not.
 */
export function resetConversation(greeting: string, key: string) {
  if (state.greetingKey === key && state.messages.length > 0) return;
  commit({
    messages: [{ id: "greeting", sender: "assistant", text: greeting, timestamp: now() }],
    pending: false,
    greetingKey: key,
  });
}

export interface SendOptions {
  message: string;
  /** The shared scope — identical for every surface, decided by one caller. */
  standardNumbers: string[];
  originalQuery: string;
}

/**
 * Sends one message on behalf of whichever surface asked, and appends both
 * it and the reply to the shared thread. Returns when the reply has landed.
 */
export async function sendAssistantMessage({ message, standardNumbers, originalQuery }: SendOptions): Promise<void> {
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

/** Exposed for tests — clears the module-level thread between cases. */
export function __resetConversationForTests() {
  state = EMPTY;
  counter = 0;
}
