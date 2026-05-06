"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { useWallet, useCopilot, useStress, useBayseSignals } from "@/hooks/zelta";
import type { CopilotMessage, CopilotResponse } from "@/types/zelta";

// ─── Suggested prompts ────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "Should I invest my free cash this week?",
  "Am I making emotional decisions right now?",
  "What's the safest move given current market stress?",
  "How much should I save before spending?",
];

// ─── Message bubble ───────────────────────────────────────────────

function MessageBubble({ message, isLast }: { message: CopilotMessage; isLast: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-[#10b981]" : "bg-slate-100"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-slate-500" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-[#10b981] text-white"
            : "rounded-tl-sm border border-gray-100 bg-white text-gray-800"
        }`}
      >
        <p className="whitespace-pre-line">{message.content}</p>
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
    <div className="flex gap-3">
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
        Response Summary
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {response.context_pills.map((pill, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <p className="text-xs text-gray-500">{pill.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {pill.value}
            </p>
          </div>
        ))}
      </div>
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

// ─── Main page ────────────────────────────────────────────────────

export default function CopilotPage() {
  const wallet = useWallet();
  const stress = useStress();
  const bayse = useBayseSignals();
  const copilot = useCopilot();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [lastResponse, setLastResponse] = useState<CopilotResponse | null>(null);

  // Auto-scroll to bottom on new messages
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, copilot.loading]);

  // Live context stats
  const isLoading = wallet.loading || stress.loading || bayse.loading;

  const stats = useMemo(
    () => [
      {
        title: "Free Cash",
        value: wallet.data ? `₦${wallet.data.free_cash.toLocaleString()}` : "—",
        color: "text-gray-800",
      },
      {
        title: "Stress Index",
        // combined_index is already 0-100; guard against NaN with isFinite
        value: stress.data && Number.isFinite(stress.data.combined_index)
          ? `${Math.round(stress.data.combined_index)}/100`
          : "—",
        color: stress.data && Number.isFinite(stress.data.combined_index)
          ? stress.data.combined_index > 60
            ? "text-red-500"
            : stress.data.combined_index > 30
            ? "text-yellow-500"
            : "text-emerald-500"
          : "text-gray-500",
      },
      {
        title: "Bayse Fear",
        // raw_crowd_stress is already 0-100 — do NOT multiply by 100
        value: bayse.data?.stress && Number.isFinite(bayse.data.stress.raw_crowd_stress)
          ? `${Math.round(bayse.data.stress.raw_crowd_stress)}%`
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

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setQuestion("");

    const response = await copilot.runCopilot({
      question: trimmed,
      conversation_history: nextMessages,
      context: {
        free_cash: wallet.data?.free_cash ?? 0,
        stress_index: stress.data?.combined_index ?? 0,
        bayse_fear: bayse.data?.stress?.raw_crowd_stress ?? 0,
      },
    });

    if (response) {
      setLastResponse(response);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
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
        title="BQ Co-pilot"
        description="Ask anything about your financial decisions"
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── Chat panel ── */}
        <section className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">BQ Co-pilot</h2>
                <p className="text-xs text-gray-500">
                  Powered by Gemini + Bayesian signals
                </p>
              </div>
            </div>
            {!isEmpty && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-5" style={{ minHeight: "360px", maxHeight: "480px" }}>
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="rounded-full bg-emerald-50 p-5">
                  <Sparkles className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    Ask me anything about your finances
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    I use your live signals to give bias-corrected guidance.
                  </p>
                </div>

                {/* Suggested prompts */}
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs text-gray-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Zap className="mb-1 h-3.5 w-3.5 text-emerald-400" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={`${msg.role}-${i}`}
                    message={msg}
                    isLast={i === messages.length - 1}
                  />
                ))}
                {copilot.loading && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Context pills (last response) */}
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
                id="copilot-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(question);
                  }
                }}
                placeholder="What should I do with my savings this month?"
                disabled={copilot.loading}
                className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={copilot.loading || !question.trim()}
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
              Press Enter to send • Shift+Enter for new line
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
                <p className="text-xs text-gray-500">
                  Live signals shaping your answers
                </p>
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
                { icon: "1", text: "Your question is sent with live Bayse + stress signals as context" },
                { icon: "2", text: "Gemini AI reasons through your behavioral profile and market data" },
                { icon: "3", text: "You get a bias-corrected, plain-English financial recommendation" },
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

          {/* Conversation stats */}
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