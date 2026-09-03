"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getConversationServerSnapshot,
  getConversationSnapshot,
  resetConversation,
  sendAssistantMessage,
  subscribeToConversation,
} from "@/lib/assistant-conversation";

interface BisChatBotProps {
  currentQuery?: string;
  /** Real standard numbers from the current results, so the server can resolve authoritative context by ID — never the recommendations' text/reason fields. */
  standardNumbers?: string[];
  /**
   * How many of `standardNumbers` came from documents the reader added in
   * the Sources panel, so the scope line can say where the context came
   * from rather than leaving them to guess.
   */
  fromAddedSources?: number;
}

const QUICK_PROMPTS = [
  "What makes the first result relevant?",
  "Show me the supporting evidence.",
  "What information is missing?",
  "Which standard should I investigate?",
];

function greetingFor(currentQuery: string): string {
  return currentQuery
    ? `You're exploring "${currentQuery}". Ask about what makes a result relevant, the supporting evidence, or what's still missing.`
    : "Ask a question about Indian Standards, product certifications, QCO orders, or laboratory test requirements.";
}

export function BisChatBot({ currentQuery = "", standardNumbers = [], fromAddedSources = 0 }: BisChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  // Which search the reader has already opened the chat for. Derived rather
  // than synced: an effect that calls setState to keep a flag in step with a
  // prop is the same value expressed twice, and only one of them can be right.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // One conversation, shared with the Sources panel's prompt box — a message
  // sent from either surface appears in both.
  const { messages, pending: loading } = useSyncExternalStore(
    subscribeToConversation,
    getConversationSnapshot,
    getConversationServerSnapshot,
  );

  // Start (or restart) the thread when the search changes. This has to be an
  // effect, not a render-phase adjustment: the conversation is shared, so
  // writing to it during render updates the Sources panel mid-render, which
  // React rightly refuses. resetConversation is a no-op when the greeting is
  // already the current one, so re-running it is harmless.
  useEffect(() => {
    resetConversation(greetingFor(currentQuery), currentQuery);
  }, [currentQuery]);

  const hasUnread = Boolean(currentQuery) && openedFor !== currentQuery;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  function openChat() {
    setIsOpen(true);
    setOpenedFor(currentQuery);
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;
    setInput("");
    // Scoped by identifier only — never a client-supplied "reason" or
    // evidence string (P0 audit, 2026-09-03). The scope is decided by one
    // caller and passed in, so every surface asks with the same one.
    await sendAssistantMessage({ message: text, standardNumbers, originalQuery: currentQuery || text });
  }


  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {hasUnread && currentQuery && (
            <div
              onClick={openChat}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-navy/30 bg-surface-raised px-3.5 py-2 shadow-sm cursor-pointer hover:border-navy transition-colors"
            >
              <span className="text-xs font-bold text-navy max-w-[200px] truncate">
                Discuss these results
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={openChat}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-md hover:bg-navy-deep transition-colors cursor-pointer"
            aria-label="Discuss these results"
          >
            <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        </div>
      )}

      {/* Expanded Chat Window at Right Corner */}
      {isOpen && (
        <div className="flex h-[520px] w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-border-strong bg-surface-raised shadow-lg overflow-hidden">
          {/* Header + context indicator (§16: always show what the chat is discussing) */}
          <div className="bg-navy px-4 py-3.5 text-white">
            <div className="flex items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Discuss these results
                </h3>
                <p className="text-[10.5px] text-white/80 font-medium truncate max-w-[260px]">
                  {currentQuery ? `Discussing: "${currentQuery}"` : "Bureau of Indian Standards"}
                </p>
                {standardNumbers.length > 0 && (
                  <p className="text-[9.5px] text-white/60 font-medium">
                    Scope: {standardNumbers.length} standard{standardNumbers.length === 1 ? "" : "s"}
                    {fromAddedSources > 0 && ` · ${fromAddedSources} from your sources`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                aria-label="Close chat"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-surface/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-2xs ${
                    msg.sender === "user"
                      ? "bg-navy text-white rounded-br-xs font-medium"
                      : "bg-surface-alt border border-border/80 text-ink rounded-bl-xs leading-relaxed"
                  }`}
                >
                  {msg.scope === "global" && (
                    <p className="mb-1.5 inline-flex items-center gap-1 rounded bg-navy/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-navy">
                      Wider BIS search
                    </p>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Standard References if returned */}
                  {msg.standards && msg.standards.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-navy">
                        Referenced Standards:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.standards.map((std, i) => (
                          <Link
                            key={i}
                            href={std.id ? `/standards/${std.id}` : "#"}
                            className="inline-flex items-center gap-1 rounded-md bg-navy/10 px-2 py-0.5 font-mono text-[11px] font-bold text-navy hover:underline"
                          >
                            <span>{std.number ?? std.title}</span>
                            <span aria-hidden="true">&rarr;</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[9.5px] font-medium text-ink-faint">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Quick question starter chips (shown if conversation is short) */}
            {messages.length <= 2 && (
              <div className="pt-2">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">
                  Suggested Questions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="rounded-lg border border-border-strong bg-surface-raised px-2.5 py-1 text-left text-[11.5px] font-semibold text-navy hover:border-navy hover:bg-navy/5 transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-ink-faint text-xs bg-surface-alt p-3 rounded-2xl w-fit border border-border/70 shadow-2xs">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-navy animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-navy animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-navy animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="font-semibold text-navy">Searching evidence...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="border-t border-border/80 bg-surface-raised p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any question about BIS standards..."
              className="flex-1 rounded-xl border border-border-strong bg-surface-alt px-3.5 py-2 text-xs sm:text-sm text-ink placeholder-ink-faint focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 shadow-2xs"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-white hover:bg-navy-deep disabled:opacity-40 transition-all cursor-pointer shadow-xs"
              aria-label="Send message"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
