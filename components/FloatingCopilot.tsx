"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useReducer,
} from "react";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  ChevronDown,
  Zap,
} from "lucide-react";
import { useCopilot, useWallet, useStress, useBayseSignals } from "@/hooks/zelta";
import type { CopilotMessage, CopilotResponse } from "@/types/zelta";

// ─── Suggested quick prompts ──────────────────────────────────────
const QUICK_PROMPTS = [
  "What should I do with my money this week?",
  "Am I spending too much right now?",
  "Is now a good time to invest?",
  "How much should I save this month?",
];

// ─── Markdown-lite inline renderer ───────────────────────────────
function InlineText({ text }: { text: string }) {
  // Handle **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function renderMessage(text: string): React.ReactNode {
  if (!text) return null;
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isBullet = lines.some((l) => /^\s*[-*•]\s/.test(l));
        const isNumbered = lines.some((l) => /^\s*\d+\.\s/.test(l));

        if (isBullet) {
          return (
            <ul key={i} className="list-disc pl-4 space-y-0.5">
              {lines
                .filter((l) => l.trim())
                .map((line, j) => (
                  <li key={j} className="text-sm">
                    <InlineText text={line.replace(/^\s*[-*•]\s/, "")} />
                  </li>
                ))}
            </ul>
          );
        }
        if (isNumbered) {
          return (
            <ol key={i} className="list-decimal pl-4 space-y-0.5">
              {lines
                .filter((l) => l.trim())
                .map((line, j) => (
                  <li key={j} className="text-sm">
                    <InlineText text={line.replace(/^\s*\d+\.\s/, "")} />
                  </li>
                ))}
            </ol>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed">
            <InlineText text={block} />
          </p>
        );
      })}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────
function Bubble({ msg }: { msg: CopilotMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isUser ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
          isUser
            ? "rounded-tr-sm bg-emerald-500 text-white"
            : "rounded-tl-sm border border-gray-100 bg-white text-gray-800"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{msg.content}</p>
        ) : (
          renderMessage(msg.content)
        )}
        {msg.timestamp && (
          <p className={`mt-1 text-[10px] ${isUser ? "text-emerald-100" : "text-gray-400"}`}>
            {new Date(msg.timestamp).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
        <Bot className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ─── Context pill row ─────────────────────────────────────────────
function ContextRow({
  freeCash,
  stress,
  fear,
  loading,
}: {
  freeCash: string;
  stress: string;
  fear: string;
  loading: boolean;
}) {
  if (loading) return null;
  return (
    <div className="flex gap-2 border-b border-gray-100 px-4 py-2">
      <Pill label="Cash" value={freeCash} color="text-gray-700" />
      <Pill label="Stress" value={stress} color={stress !== "—" && parseInt(stress) > 60 ? "text-red-500" : "text-emerald-600"} />
      <Pill label="Fear" value={fear} color="text-orange-500" />
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className={`text-[11px] font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Main floating widget ─────────────────────────────────────────
export default function FloatingCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [hasGreeted, setHasGreeted] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const copilot = useCopilot();
  const wallet = useWallet();
  const stress = useStress();
  const bayse = useBayseSignals();

  // Live context values
  const freeCash = wallet.data ? `₦${wallet.data.free_cash.toLocaleString()}` : "—";
  const stressVal = stress.data?.stress_index != null
    ? `${Math.round(stress.data.stress_index)}/100`
    : "—";
  const fearVal = bayse.data?.stress?.crowd_stress != null
    ? `${Math.round(bayse.data.stress.crowd_stress)}%`
    : "—";

  const contextLoading = wallet.loading || stress.loading || bayse.loading;

  // Auto-scroll on new messages
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, copilot.loading, open]);

  // Increment unread badge when closed and a new assistant message arrives
  useEffect(() => {
    if (!open && messages.length > 0 && messages[messages.length - 1].role === "assistant") {
      setUnread((n) => n + 1);
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);

      // One-time greeting after first open
      if (!hasGreeted && messages.length === 0) {
        setHasGreeted(true);
        const greeting: CopilotMessage = {
          role: "assistant",
          content: "Hi! I'm your ZELTA co-pilot 👋\n\nAsk me anything about your money — what to save, when to invest, or whether you're making emotional decisions.",
          timestamp: new Date().toISOString(),
        };
        setMessages([greeting]);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || copilot.loading) return;

      const userMsg: CopilotMessage = {
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");

      const response = await copilot.runCopilot({
        question: trimmed,
        conversation_history: next,
        context: {
          free_cash: wallet.data?.free_cash ?? 0,
          stress_index: stress.data?.stress_index ?? 0,
          bayse_fear: bayse.data?.stress?.crowd_stress ?? 0,
        },
      });

      if (response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.answer,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    },
    [messages, copilot, wallet.data, stress.data, bayse.data]
  );

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setHasGreeted(false);
    setInput("");
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={`
          fixed z-50 flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 shadow-2xl
          transition-all duration-300 ease-out
          ${open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
          }
          /* Mobile: sheet from bottom */
          bottom-20 left-3 right-3 max-h-[76vh]
          /* Desktop: fixed bottom-right panel */
          lg:bottom-8 lg:left-auto lg:right-6 lg:w-[380px] lg:max-h-[580px]
        `}
        style={{ willChange: "transform, opacity" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
              <Bot className="h-4 w-4 text-white" />
              {/* Live indicator */}
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">ZELTA Co-pilot</p>
              <p className="mt-0.5 text-[10px] text-gray-400">Powered by Gemini · Bayesian</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 1 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-500 transition hover:bg-gray-50"
              >
                <RefreshCw className="h-3 w-3" /> Clear
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:bg-gray-100"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live context strip */}
        <ContextRow
          freeCash={freeCash}
          stress={stressVal}
          fear={fearVal}
          loading={contextLoading}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isEmpty ? (
            /* Empty state with quick prompts */
            <div className="flex h-full flex-col items-center justify-center gap-4 pt-2 pb-4 text-center">
              <div className="rounded-full bg-emerald-50 p-4">
                <Sparkles className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Ask me anything</p>
                <p className="mt-0.5 text-xs text-gray-500">I use your live signals to give bias-corrected answers.</p>
              </div>
              <div className="grid w-full grid-cols-1 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    disabled={copilot.loading}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-xs text-gray-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                  >
                    <Zap className="h-3 w-3 shrink-0 text-emerald-400" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <Bubble key={`${msg.role}-${i}`} msg={msg} />
              ))}
              {copilot.loading && <TypingDots />}
            </>
          )}

          {/* Error */}
          {copilot.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              {copilot.error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-gray-200 bg-white p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your money…"
              disabled={copilot.loading}
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              style={{ maxHeight: "96px", overflowY: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={copilot.loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white transition hover:bg-emerald-600 active:scale-95 disabled:opacity-40"
            >
              {copilot.loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-400">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── FAB trigger ────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open ZELTA Co-pilot"
        className={`
          fixed z-50 flex items-center justify-center rounded-full shadow-xl
          transition-all duration-300 ease-out
          active:scale-95
          /* Mobile: above bottom nav */
          bottom-[4.5rem] right-4 h-14 w-14
          /* Desktop: bottom right */
          lg:bottom-8 lg:right-6 lg:h-14 lg:w-14
          ${open
            ? "bg-gray-700 hover:bg-gray-800 rotate-0"
            : "bg-emerald-500 hover:bg-emerald-600"
          }
        `}
      >
        {open ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <>
            <MessageSquare className="h-6 w-6 text-white" />
            {/* Unread badge */}
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unread}
              </span>
            )}
            {/* Pulse ring when no messages yet — draws attention */}
            {messages.length === 0 && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
            )}
          </>
        )}
      </button>
    </>
  );
}