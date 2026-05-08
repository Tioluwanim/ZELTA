"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import {
  Activity,
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  Zap,
  ChevronDown,
  Info,
} from "lucide-react";
import { useWallet, useCopilot, useStress, useBayseSignals } from "@/hooks/zelta";
import type { CopilotMessage, CopilotResponse } from "@/types/zelta";

// ─── Suggested prompts ────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "I am confused. What should I do with my money this week?",
  "Should I invest my free cash this week?",
  "Am I making emotional decisions right now?",
  "How much should I save before spending?",
];

// ─── Markdown-lite renderer ───────────────────────────────────────
// Renders **bold**, *italic*, bullet lists, numbered lists, and line breaks
// without a heavy library. Preserves all characters — nothing is truncated.

function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split into paragraphs / blocks by double newline
  const blocks = text.split(/\n\n+/);

  return blocks.map((block, blockIdx) => {
    const lines = block.split("\n");

    // Detect bullet list block
    const isBullet = lines.every((l) => /^\s*[-*•]\s/.test(l) || l.trim() === "");
    const isNumbered = lines.every((l) => /^\s*\d+\.\s/.test(l) || l.trim() === "");

    if (isBullet) {
      return (
        <ul key={blockIdx} className="mt-2 list-disc pl-5 space-y-1">
          {lines.filter((l) => l.trim()).map((line, i) => (
            <li key={i}>{inlineFormat(line.replace(/^\s*[-*•]\s/, ""))}</li>
          ))}
        </ul>
      );
    }

    if (isNumbered) {
      return (
        <ol key={blockIdx} className="mt-2 list-decimal pl-5 space-y-1">
          {lines.filter((l) => l.trim()).map((line, i) => (
            <li key={i}>{inlineFormat(line.replace(/^\s*\d+\.\s/, ""))}</li>
          ))}
        </ol>
      );
    }

    // Normal paragraph — join lines with space but preserve single newlines
    return (
      <p key={blockIdx} className={blockIdx > 0 ? "mt-2" : ""}>
        {lines.map((line, li) => (
          <React.Fragment key={li}>
            {inlineFormat(line)}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

// Bold (**text**), italic (*text*), inline code (`code`)
function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Pattern: **bold**, *italic*, `code`
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={match.index} className="rounded bg-black/10 px-1 py-0.5 text-[11px] font-mono">
          {match[4]}
        </code>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length === 0 ? text : <>{parts}</>;
}

// ─── Message bubble ───────────────────────────────────────────────

function MessageBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-start`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5 ${
          isUser ? "bg-[#10b981]" : "bg-slate-100"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-slate-500" />
        )}
      </div>

      {/* Bubble — no max-width cap on assistant, full width allowed */}
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "max-w-[80%] rounded-tr-sm bg-[#10b981] text-white"
            : "w-full rounded-tl-sm border border-gray-100 bg-white text-gray-800"
        }`}
      >
        {isUser ? (
          // User messages: plain text, no markdown
          <p className="whitespace-pre-line">{message.content}</p>
        ) : (
          // Assistant messages: full markdown render, no truncation
          <div className="prose-sm max-w-none text-gray-800">
            {renderMarkdown(message.content)}
          </div>
        )}

        {message.timestamp && (
          <p
            className={`mt-1.5 text-[10px] ${
              isUser ? "text-green-100" : "text-gray-400"
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString("en-US", {
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

// ─── Typing indicator ─────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
        <Bot className="h-4 w-4 text-slate-500" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Context pills from last response ────────────────────────────

function ContextPills({ response }: { response: CopilotResponse }) {
  if (!response.context_pills?.length) return null;
  return (
    <div className="mt-3 rounded-2xl border border-gray-100 bg-slate-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Response Context
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {response.context_pills.map((pill, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">{pill.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">{pill.value}</p>
          </div>
        ))}
      </div>

      {/* Verdict badge */}
      {response.verdict && response.verdict !== "HOLD" && response.verdict_amount != null && response.verdict_amount > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
          <Info className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">
            {response.verdict}: ₦{response.verdict_amount.toLocaleString()}
          </p>
        </div>
      )}

      {/* Confidence */}
      {response.confidence != null && response.confidence > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          Response confidence: {Math.round(response.confidence)}%
        </p>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  color,
  loading,
}: {
  title: string;
  value: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
      <p className="text-xs text-gray-500">{title}</p>
      {loading ? (
        <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
      )}
    </div>
  );
}

// ─── Scroll-to-bottom button ─────────────────────────────────────

function ScrollToBottomBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition"
      title="Scroll to latest"
    >
      <ChevronDown className="h-4 w-4 text-gray-500" />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function CopilotPage() {
  const wallet = useWallet();
  const stress = useStress();
  const bayse = useBayseSignals();
  const copilot = useCopilot();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [lastResponse, setLastResponse] = useState<CopilotResponse | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll whenever messages change or loading state changes
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, copilot.loading, scrollToBottom]);

  // Track scroll position to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  const isLoading = wallet.loading || stress.loading || bayse.loading;

  const stats = useMemo(
    () => [
      {
        title: "Free Cash",
        value: wallet.data ? `₦${wallet.data.free_cash.toLocaleString()}` : "—",
        color: "text-gray-800",
      },
      {
        title: "Market Panic Level",
        value:
          stress.data && Number.isFinite(stress.data.stress_index)
            ? `${Math.round(stress.data.stress_index)}/100`
            : "—",
        color:
          stress.data && Number.isFinite(stress.data.stress_index)
            ? stress.data.stress_index > 60
              ? "text-red-500"
              : stress.data.stress_index > 30
              ? "text-yellow-500"
              : "text-emerald-500"
            : "text-gray-500",
      },
      {
        title: "Market Fear Level (Bayse)",
        // crowd_stress is 0-100 — no *100
        value:
          bayse.data?.stress && Number.isFinite(bayse.data.stress.crowd_stress)
            ? `${Math.round(bayse.data.stress.crowd_stress)}%`
            : "—",
        color: "text-orange-400",
      },
    ],
    [wallet.data, stress.data, bayse.data]
  );

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || copilot.loading) return;

    const userMsg: CopilotMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Snapshot history BEFORE adding the new user message.
    // The backend service already slices to last 6 turns.
    // We do NOT include the current question in conversation_history —
    // it is passed separately in the `question` field to avoid duplication.
    const historyBeforeThisMessage = [...messages];

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");

    const response = await copilot.runCopilot({
      question: trimmed,
      // history = all previous turns, NOT including the current question
      conversation_history: historyBeforeThisMessage,
      context: {
        free_cash: wallet.data?.free_cash ?? 0,
        stress_index: stress.data?.stress_index ?? 0,
        // crowd_stress is 0-100
        bayse_fear: bayse.data?.stress?.crowd_stress ?? 0,
      },
    });

    if (response) {
      setLastResponse(response);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,  // full answer — no truncation
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(question);
  };

  const handleClear = () => {
    setMessages([]);
    setLastResponse(null);
    setQuestion("");
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="px-3 lg:px-0 pb-10">
      <PageHeader
        title="ZELTA Co-pilot"
        description="Confused? Ask ZELTA anything."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── Chat panel ── */}
        <section className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">ZELTA Co-pilot</h2>
                <p className="text-xs text-gray-500">Powered by AI and your live market-emotion signals</p>
              </div>
            </div>
            {!isEmpty && (
              <button
                onClick={handleClear}
                aria-label="Clear conversation"
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Messages — grows to fit content, scroll-anchored */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="relative flex-1 overflow-y-auto p-5"
            style={{ minHeight: "400px", maxHeight: "calc(100vh - 340px)" }}
          >
            {isEmpty ? (
              /* Empty state */
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center py-10">
                <div className="rounded-full bg-emerald-50 p-5">
                  <Sparkles className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Ask me anything about your finances</p>
                  <p className="mt-1 text-sm text-gray-500">
                    I use your live signals to give simple, step-by-step guidance.
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      aria-label={`Use suggested question: ${prompt}`}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs text-gray-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Zap className="mb-1 h-3.5 w-3.5 text-emerald-400" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message list — no height cap on individual messages */
              <div className="space-y-5">
                {messages.map((msg, i) => (
                  <MessageBubble key={`${msg.role}-${i}`} message={msg} />
                ))}
                {copilot.loading && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            )}

            {/* Scroll-to-bottom FAB */}
            {showScrollBtn && !isEmpty && (
              <ScrollToBottomBtn onClick={scrollToBottom} />
            )}
          </div>

          {/* Context pills from last response */}
          {lastResponse && !isEmpty && (
            <div className="border-t border-gray-100 px-5 pb-3">
              <ContextPills response={lastResponse} />
            </div>
          )}

          {/* Error */}
          {copilot.error && (
            <div className="mx-5 mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {copilot.error}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(question);
                  }
                }}
                placeholder="What should I do with my savings this month?"
                aria-label="Ask ZELTA Co-pilot a question"
                disabled={copilot.loading}
                className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={copilot.loading || !question.trim()}
                aria-label="Send message"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#10b981] text-white transition hover:bg-[#0b9268] disabled:opacity-40"
              >
                {copilot.loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] text-gray-400">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </section>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          {/* Live signals */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-2">
                <Sparkles className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Your current picture</h3>
                <p className="text-xs text-gray-500">Live signals shaping your answers</p>
              </div>
            </div>
            <div className="space-y-2">
              {stats.map((s) => (
                <StatCard
                  key={s.title}
                  title={s.title}
                  value={s.value}
                  color={s.color}
                  loading={isLoading}
                />
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-100 p-2">
                <Activity className="h-4 w-4 text-slate-600" />
              </div>
              <h3 className="font-bold text-gray-900">How Co-pilot works</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              {[
                { icon: "1", text: "Your question is sent with your current market panic and Bayse signals" },
                { icon: "2", text: "AI checks your context and risk signals before answering" },
                { icon: "3", text: "You get a plain-English next step you can act on" },
              ].map(({ icon, text }) => (
                <div key={icon} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                    {icon}
                  </span>
                  <p className="leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Session stats */}
          {!isEmpty && (
            <div className="rounded-2xl border border-gray-100 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                This session
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-emerald-600">Questions asked</p>
                  <p className="text-xl font-bold text-emerald-800">
                    {messages.filter((m) => m.role === "user").length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600">Responses</p>
                  <p className="text-xl font-bold text-emerald-800">
                    {messages.filter((m) => m.role === "assistant").length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}