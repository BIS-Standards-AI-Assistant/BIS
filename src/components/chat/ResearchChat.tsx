"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getConversationServerSnapshot,
  getConversationSnapshot,
  sendAssistantMessage,
  subscribeToConversation,
} from "@/lib/assistant-conversation";
import { SourceTag } from "@/components/trust/SourceTag";

/**
 * The centre panel's research conversation (§3, §26, §27).
 *
 * This replaces the search box that used to sit here. That box called
 * runQuery, which rewrote `?q=`, ran the *global* /api/v1/query pipeline
 * and replaced the results — so a follow-up question threw away the
 * research context and started an unrelated search. Two search boxes, and
 * the one labelled "Ask a follow-up" was the more misleading of them.
 *
 * It sends through the existing shared conversation store and
 * /api/v1/chat, which is already scoped by standard number and already
 * runs evidence aggregation, applicability and the knowledge boundary. No
 * second pipeline was built; §16's retrieval chain is the one that already
 * exists behind that endpoint.
 *
 * The scope is passed in rather than derived here, so the left panel's
 * selection, the chat and the assistant all answer against the same
 * context and cannot disagree.
 */
export function ResearchChat({
  scopeStandardNumbers,
  scopeQuery,
  hasSelectedSources,
  onManageSources,
}: {
  scopeStandardNumbers: string[];
  scopeQuery: string;
  hasSelectedSources: boolean;
  onManageSources: () => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const { messages, pending } = useSyncExternalStore(
    subscribeToConversation,
    getConversationSnapshot,
    getConversationServerSnapshot,
  );

  const exchanges = messages.filter((m) => m.id !== "greeting");

  useEffect(() => {
    if (exchanges.length > 0) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [exchanges.length, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    await sendAssistantMessage({
      message: text,
      standardNumbers: scopeStandardNumbers,
      originalQuery: scopeQuery || text,
    });
  }

  return (
    <section className="mt-6" aria-label="Research conversation">
      {/* §28: what the assistant is reading, and a way to change it. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
          Research context ·{" "}
          {scopeStandardNumbers.length > 0
            ? `${scopeStandardNumbers.length} BIS source${scopeStandardNumbers.length === 1 ? "" : "s"}`
            : "none selected"}
        </p>
        <button
          type="button"
          onClick={onManageSources}
          className="text-[11.5px] font-bold text-navy hover:underline"
        >
          Manage sources
        </button>
      </div>

      {scopeStandardNumbers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {scopeStandardNumbers.slice(0, 8).map((n) => (
            <span key={n} className="rounded bg-navy/10 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-navy">
              {n}
            </span>
          ))}
        </div>
      )}

      {/* §29: the opening line depends on whether anything is in scope. */}
      {exchanges.length === 0 && !pending && (
        <p className="mt-4 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-soft">
          {hasSelectedSources || scopeStandardNumbers.length > 0
            ? "Ask about the scope, testing, certification, applicability or evidence of these sources. Answers come from indexed BIS evidence and cite where they came from."
            : "Search and select BIS sources on the left to start a source-grounded research conversation."}
        </p>
      )}

      {/* §27: one continuous session, user and assistant visibly distinct. */}
      {exchanges.length > 0 && (
        <ol className="mt-4 space-y-4">
          {exchanges.map((m) => (
            <li key={m.id} className={m.sender === "user" ? "flex justify-end" : ""}>
              {m.sender === "user" ? (
                <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-navy px-4 py-2.5 text-[13.5px] font-medium text-white">
                  {m.text}
                </p>
              ) : (
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border/70 bg-surface-raised px-4 py-3">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <SourceTag provenance={m.failed ? "inference" : "ai"} />
                    {m.scope === "global" && (
                      <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-navy">
                        Wider BIS search
                      </span>
                    )}
                  </div>
                  <p className={`whitespace-pre-line text-[13.5px] leading-relaxed ${m.failed ? "text-danger" : "text-ink"}`}>
                    {m.text}
                  </p>
                  {m.standards && m.standards.length > 0 && (
                    <div className="mt-2.5 border-t border-border/60 pt-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">
                        Evidence from
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {m.standards.map((s, i) => (
                          <Link
                            key={i}
                            href={s.id ? `/standards/${s.id}` : "#"}
                            className="rounded bg-navy/10 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-navy hover:underline"
                          >
                            {s.number ?? s.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* §25: says what it is doing, and never "Searching…" — this is not search. */}
      {pending && (
        <p role="status" className="mt-4 text-[13px] font-medium text-ink-soft">
          Reading selected BIS sources and preparing an evidence-backed answer…
        </p>
      )}

      <div ref={endRef} />

      {/* §26: a chat composer, not a search bar. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="sticky bottom-0 z-20 -mx-1 mt-4 border-t border-border/60 bg-surface px-1 pb-3 pt-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-border-strong bg-surface-raised px-3 py-2 focus-within:border-navy">
          <ChatIcon className="mb-1.5 h-4 w-4 shrink-0 text-ink-faint" />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter is a newline (§26).
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Ask a follow-up about these standards…"
            aria-label="Ask a follow-up about these standards"
            disabled={pending}
            className="max-h-32 min-h-[24px] w-full flex-1 resize-none bg-transparent py-1 text-[13.5px] text-ink placeholder-ink-faint focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="mb-0.5 shrink-0 rounded-lg bg-navy px-3.5 py-1.5 text-[12.5px] font-bold text-white transition-colors hover:bg-navy-deep disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
