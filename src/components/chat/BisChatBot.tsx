"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { QueryResponse } from "@/types/api";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  standards?: { number: string | null; title: string; id?: string }[];
}

interface BisChatBotProps {
  currentQuery?: string;
}

const QUICK_PROMPTS = [
  "What tests are mandatory?",
  "Is ISI mark mandatory for this?",
  "How to apply for BIS certification?",
  "What are the relevant clauses?",
];

function greetingFor(currentQuery: string): Message {
  const text = currentQuery
    ? `Namaste! I am your Bureau of Indian Standards (BIS) AI Assistant. I can help answer any questions about applicable Indian Standards, test requirements, ISI marking, or certification procedures for "${currentQuery}". What would you like to know?`
    : "Namaste! I am your Bureau of Indian Standards (BIS) AI Assistant. Ask me any question about Indian Standards, product certifications, QCO orders, or laboratory test requirements.";

  return {
    id: "initial-welcome",
    sender: "assistant",
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export function BisChatBot({ currentQuery = "" }: BisChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [greetingFor(currentQuery)]);
  const [hasUnread, setHasUnread] = useState(false);
  const [syncedQuery, setSyncedQuery] = useState(currentQuery);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const idCounterRef = useRef(0);

  function nextId(prefix: string) {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }

  // Reset the greeting when currentQuery changes (adjusting state during render, not in an effect)
  if (currentQuery !== syncedQuery) {
    setSyncedQuery(currentQuery);
    setMessages([greetingFor(currentQuery)]);
    if (currentQuery) {
      setHasUnread(true);
    }
  }

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  function openChat() {
    setIsOpen(true);
    setHasUnread(false);
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: nextId("user"),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Send query to the BIS query engine
      const contextualQuery = currentQuery
        ? `${currentQuery} — Question: ${text}`
        : text;

      const response = await fetch("/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: contextualQuery }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: QueryResponse = await response.json();

      const extractedStandards = (data.recommendations ?? []).slice(0, 3).map((r) => ({
        number: r.standardNumber,
        title: r.title,
        id: r.evidence[0]?.documentId,
      }));

      const botMessage: Message = {
        id: nextId("assistant"),
        sender: "assistant",
        text: data.answer || "I have analyzed the Bureau standards regarding your question.",
        standards: extractedStandards.length > 0 ? extractedStandards : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("error"),
          sender: "assistant",
          text: "I am temporarily unable to consult the Bureau knowledge base. Please verify your connection or try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {hasUnread && currentQuery && (
            <div
              onClick={openChat}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-navy/30 bg-surface-raised px-3.5 py-2 shadow-lg cursor-pointer hover:border-navy transition-all"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-navy max-w-[180px] truncate">
                Ask BIS about &ldquo;{currentQuery}&rdquo;
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={openChat}
            className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy via-navy to-blue text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/20"
            aria-label="Open BIS Chatbot"
          >
            {/* Bureau Emblem / Chat Icon */}
            <svg className="h-7 w-7 text-white transition-transform group-hover:rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>

            {/* Live Indicator */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          </button>
        </div>
      )}

      {/* Expanded Chat Window at Right Corner */}
      {isOpen && (
        <div className="flex h-[520px] w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border-strong bg-surface-raised shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-navy via-navy to-navy-deep px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                    BIS Standards Assistant
                  </h3>
                  <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-300 border border-emerald-400/30">
                    Live
                  </span>
                </div>
                <p className="text-[10.5px] text-white/80 font-medium">
                  Authoritative Bureau of Indian Standards AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                title="Minimize chat"
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
                <span className="font-semibold text-navy">Consulting BIS Knowledge Base...</span>
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
