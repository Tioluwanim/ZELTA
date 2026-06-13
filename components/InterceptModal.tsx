"use client";

/**
 * ZELTA Intercept Modal
 * ─────────────────────────────────────────────────────────────────
 * The hero feature from the concept note.
 *
 * Concept note requirements satisfied:
 * ✅ Layer 1 — Market Pulse: shows live stress score
 * ✅ Layer 2 — Intent Check: academic necessity vs impulse label
 * ✅ Layer 3 — Academic Stress: exam countdown + λt modifier
 * ✅ Layer 4 — The Gig Connection: effort-vs-reward recovery path
 * ✅ Runway counter (days, not balance)
 * ✅ Bias named and explained
 * ✅ Guardian principle: warns, never hard-blocks
 */

import React, { useEffect, useState } from "react";
import type { GigSuggestion } from "@/types/zelta";
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Brain,
  Zap,
  ChevronRight,
  Loader2,
  CheckCircle2,
  TrendingDown,
  Briefcase,
  Clock,
  DollarSign,
  BookOpen,
  ShoppingBag,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

export type InterceptReason =
  | "LOW_RUNWAY"
  | "SAVINGS_FLOOR"
  | "HIGH_STRESS"
  | "EMERGENCY_MODE"
  | "SURVIVAL_MODE"
  | "LARGE_TRANSACTION"
  | "BIAS_DETECTED"
  | "EXAM_PROXIMITY";

export interface InterceptModalProps {
  // transaction
  amount: number;
  category?: string;
  description?: string;
  intentType?: "NECESSITY" | "IMPULSE" | "UNKNOWN"; // Layer 2 — Intent Check
  // student model
  freeCash: number;
  weeksRunway?: number;
  daysToExam?: number; // Layer 3 — Academic Stress
  lambdaT?: number; // λt modifier value
  // market
  stressScore?: number; // Layer 1 — Market Pulse
  stressLevel?: string;
  marketTitle?: string;
  // AI verdict
  agentMode?: "NORMAL" | "SURVIVAL" | "EMERGENCY";
  bqAlert?: string;
  safeAmount?: number;
  biasDetected?: string | null;
  reasons?: InterceptReason[];
  // Layer 4 — Gig Connection
  gigSuggestions?: GigSuggestion[];
  // callbacks
  onContinue: () => void | Promise<void>;
  onCancel: () => void;
  onSimulate?: () => void;
  onClose?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────

const fmt = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

function daysAfterSpend(
  freeCash: number,
  amount: number,
  weeklyBurn = 7000
) {
  const remaining = Math.max(0, freeCash - amount);
  return weeklyBurn > 0 ? Math.round((remaining / weeklyBurn) * 7) : 0;
}

function severityConfig(agentMode?: string, stressScore = 0) {
  if (agentMode === "EMERGENCY")
    return {
      bg: "bg-red-50",
      border: "border-red-300",
      headerBg: "bg-red-600",
      badge: "bg-red-100 text-red-700",
      icon: <ShieldAlert className="h-5 w-5 text-white" />,
      label: "EMERGENCY",
      labelColor: "text-red-600",
      btnPrimary: "bg-emerald-500 hover:bg-emerald-600",
      btnOverride: "border-red-200 text-red-500 hover:bg-red-50",
      barColor: "bg-red-500",
    };

  if (agentMode === "SURVIVAL")
    return {
      bg: "bg-orange-50",
      border: "border-orange-200",
      headerBg: "bg-orange-500",
      badge: "bg-orange-100 text-orange-700",
      icon: <AlertTriangle className="h-5 w-5 text-white" />,
      label: "SURVIVAL MODE",
      labelColor: "text-orange-600",
      btnPrimary: "bg-emerald-500 hover:bg-emerald-600",
      btnOverride: "border-orange-200 text-orange-500 hover:bg-orange-50",
      barColor: "bg-orange-500",
    };

  if (stressScore >= 60)
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      headerBg: "bg-amber-500",
      badge: "bg-amber-100 text-amber-700",
      icon: <AlertTriangle className="h-5 w-5 text-white" />,
      label: "HIGH STRESS",
      labelColor: "text-amber-600",
      btnPrimary: "bg-emerald-500 hover:bg-emerald-600",
      btnOverride: "border-amber-200 text-amber-500 hover:bg-amber-50",
      barColor: "bg-amber-500",
    };

  return {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    headerBg: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-700",
    icon: <AlertTriangle className="h-5 w-5 text-white" />,
    label: "CAUTION",
    labelColor: "text-yellow-600",
    btnPrimary: "bg-emerald-500 hover:bg-emerald-600",
    btnOverride: "border-gray-200 text-gray-500 hover:bg-gray-50",
    barColor: "bg-yellow-400",
  };
}

const biasLabels: Record<string, string> = {
  FOMO_BUYING:
    "FOMO Spending — your last 3 big transactions happened on weekends after peers spent first",
  PANIC_SELLING:
    "Panic Spending — stress may be driving this decision, not need",
  PRESENT_BIAS:
    "Present Bias — prioritising right now over upcoming fees",
  LOSS_AVERSION:
    "Loss Aversion — fear of missing out is influencing this",
  HERD_BEHAVIOR:
    "Herd Behaviour — others spending doesn't mean you should",
  MENTAL_ACCOUNTING:
    "Mental Accounting — don't treat this money differently just because of its source",
};

// ── Intent Badge ───────────────────────────────────────────────────

function IntentBadge({ intent }: { intent?: string }) {
  if (!intent || intent === "UNKNOWN") return null;
  const isNecessity = intent === "NECESSITY";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
        isNecessity
          ? "border-emerald-100 bg-emerald-50"
          : "border-orange-100 bg-orange-50"
      }`}
    >
      {isNecessity ? (
        <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <ShoppingBag className="h-4 w-4 text-orange-500 shrink-0" />
      )}
      <div>
        <p
          className={`text-[10px] font-bold uppercase tracking-wide ${
            isNecessity ? "text-emerald-600" : "text-orange-600"
          }`}
        >
          Layer 2 — Intent Check
        </p>
        <p
          className={`text-xs ${
            isNecessity ? "text-emerald-700" : "text-orange-700"
          }`}
        >
          {isNecessity
            ? "This looks like an academic necessity — low risk."
            : "This looks like an impulse purchase — higher risk right now."}
        </p>
      </div>
    </div>
  );
}

// ── Animated stress bar ─────────────────────────────────────────────

function StressBar({ score, barColor }: { score: number; barColor: string }) {
  const [w, setW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setW(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  const label =
    score >= 80 ? "EXTREME PANIC" : score >= 60 ? "HIGH STRESS" : score >= 30 ? "MODERATE" : "CALM";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span className="font-semibold uppercase tracking-wide">
          Layer 1 — Market Pulse
        </span>
        <span className="font-bold">
          {score}/100 · {label}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

// ── Exam countdown ─────────────────────────────────────────────────

function ExamBadge({
  daysToExam,
  lambdaT,
}: {
  daysToExam?: number;
  lambdaT?: number;
}) {
  if (!daysToExam) return null;
  const urgent = daysToExam <= 14;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${
        urgent ? "border-red-100 bg-red-50" : "border-gray-100 bg-gray-50"
      }`}
    >
      <BookOpen
        className={`h-4 w-4 shrink-0 mt-0.5 ${
          urgent ? "text-red-500" : "text-gray-400"
        }`}
      />
      <div>
        <p
          className={`text-[10px] font-bold uppercase tracking-wide ${
            urgent ? "text-red-600" : "text-gray-500"
          }`}
        >
          Layer 3 — Academic Stress
        </p>
        <p className={`text-xs ${urgent ? "text-red-700 font-semibold" : "text-gray-600"}`}>
          Exams in {daysToExam} days
          {lambdaT !== undefined && (
            <span className="font-normal text-gray-400">
              {" "}
              · λt = {lambdaT.toFixed(2)} — Zelta is{" "}
              {lambdaT < 0.9 ? "more conservative" : "standard"} right now
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Runway card ────────────────────────────────────────────────────

function RunwayCard({
  freeCash,
  amount,
  weeksRunway,
}: {
  freeCash: number;
  amount: number;
  weeksRunway?: number;
}) {
  const daysBefore = weeksRunway ? Math.round(weeksRunway * 7) : daysAfterSpend(freeCash, 0);
  const daysAfter = daysAfterSpend(freeCash, amount);
  const danger = daysAfter < 7;
  const pct = Math.min(100, Math.round((daysAfter / Math.max(daysBefore, 1)) * 100));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
        Runway Impact
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="text-[10px] text-emerald-600 font-medium uppercase">Before</p>
          <p className="text-xl font-bold text-emerald-700">{daysBefore}d</p>
          <p className="text-[9px] text-emerald-500">{fmt(freeCash)}</p>
        </div>
        <div
          className={`rounded-xl border p-3 text-center ${
            danger ? "border-red-200 bg-red-50" : "border-orange-100 bg-orange-50"
          }`}
        >
          <p
            className={`text-[10px] font-medium uppercase ${
              danger ? "text-red-600" : "text-orange-600"
            }`}
          >
            After spend
          </p>
          <p className={`text-xl font-bold ${danger ? "text-red-700" : "text-orange-700"}`}>
            {daysAfter}d
          </p>
          <p className={`text-[9px] ${danger ? "text-red-500" : "text-orange-500"}`}>
            {fmt(Math.max(0, freeCash - amount))}
          </p>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Runway remaining after spend</span>
          <span className={`font-bold ${danger ? "text-red-600" : "text-orange-500"}`}>
            {pct}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-700 ${
              danger ? "bg-red-500" : "bg-orange-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {danger && (
          <p className="mt-1.5 text-xs font-semibold text-red-600">
            ⚠ Less than 7 days of runway — danger zone.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Gig Connection ─────────────────────────────────────────────────

function GigConnection({
  gigs,
  shortfall,
}: {
  gigs: GigSuggestion[];
  shortfall: number;
}) {
  if (!gigs.length) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-emerald-600 shrink-0" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
            Layer 4 — The Gig Connection
          </p>
          <p className="text-xs text-emerald-700 font-medium">
            You need {fmt(shortfall)} — here&apos;s how to earn it:
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {gigs.slice(0, 3).map((g, i) => (
          <div
            key={g.id ?? i}
            className="rounded-xl border border-emerald-100 bg-white p-3 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{g.task}</p>
              {g.location && <p className="text-[10px] text-gray-400">{g.location}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <Clock className="h-3 w-3" />
                {typeof g.hours === "number" ? `${g.hours}h` : "—"}
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                <DollarSign className="h-3.5 w-3.5" />
                {fmt(g.payout)}
              </div>
              <div className="text-[10px] font-bold text-emerald-600 bg-emerald-100 rounded-lg px-1.5 py-0.5">
                {typeof g.worth_score === "number" ? `${g.worth_score}/100` : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-emerald-600 text-center">
        Worth scores ranked by effort-vs-reward ratio
      </p>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────

export default function InterceptModal({
  amount,
  category = "general",
  description,
  intentType,
  freeCash,
  weeksRunway,
  daysToExam,
  lambdaT,
  stressScore = 0,
  stressLevel,
  marketTitle,
  agentMode,
  bqAlert,
  safeAmount,
  biasDetected,
  reasons = [],
  gigSuggestions = [],
  onContinue,
  onCancel,
  onSimulate,
  onClose,
}: InterceptModalProps) {
  const [continueLoading, setContinueLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const cfg = severityConfig(agentMode, stressScore);
  const biasLabel = biasDetected
    ? biasLabels[biasDetected.toUpperCase()] ?? `Bias detected: ${biasDetected}`
    : null;
  const pctOfCash = freeCash > 0 ? Math.round((amount / freeCash) * 100) : 0;
  const shortfall = Math.max(0, amount - (freeCash - freeCash * 0.6));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleContinue = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setContinueLoading(true);
    try {
      await onContinue();
    } finally {
      setContinueLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center px-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
          onCancel();
        }
      }}
    >
      <div
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl ${cfg.bg} ${cfg.border} border-2 shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`${cfg.headerBg} px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {cfg.icon}
            <div>
              <p className="text-white font-bold text-sm">ZELTA Guardian</p>
              <p className="text-white/80 text-xs">
                {cfg.label} — Decision checkpoint
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose?.();
              onCancel();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 max-h-[72vh] overflow-y-auto">
          {/* Transaction summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
              You attempted
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmt(amount)}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {category}
                  {description ? ` — ${description}` : ""}
                </p>
              </div>
              <span className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase ${cfg.badge}`}>
                {pctOfCash}% of free cash
              </span>
            </div>
          </div>

          {/* Layer 2 — Intent Check */}
          <IntentBadge intent={intentType} />

          {/* BQ Alert — Gemini plain English */}
          {bqAlert && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 flex gap-3">
              <Brain className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1">
                  ZELTA says
                </p>
                <p className="text-sm text-gray-800 leading-relaxed">{bqAlert}</p>
              </div>
            </div>
          )}

          {/* Layer 1 — Market Pulse */}
          {stressScore > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <StressBar score={stressScore} barColor={cfg.barColor} />
              {marketTitle && <p className="mt-1 text-[10px] text-gray-400">Market: {marketTitle}</p>}
              {stressLevel && <p className="mt-1 text-[10px] text-gray-400">Stress level: {stressLevel}</p>}
            </div>
          )}

          {/* Layer 3 — Academic Stress */}
          <ExamBadge daysToExam={daysToExam} lambdaT={lambdaT} />

          {/* Bias */}
          {biasLabel && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 flex gap-2">
              <Zap className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-800 leading-relaxed">{biasLabel}</p>
            </div>
          )}

          {/* Runway impact */}
          <RunwayCard freeCash={freeCash} amount={amount} weeksRunway={weeksRunway} />

          {/* Safe alternative */}
          {safeAmount !== undefined && safeAmount > 0 && safeAmount < amount && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800">
                Kelly model suggests capping at{" "}
                <span className="font-bold">{fmt(safeAmount)}</span> instead of{" "}
                {fmt(amount)}.
              </p>
            </div>
          )}

          {/* Layer 4 — Gig Connection */}
          {gigSuggestions.length > 0 && (
            <GigConnection gigs={gigSuggestions} shortfall={shortfall} />
          )}

          {/* Optional reasons list */}
          {reasons.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Why this was flagged
              </p>
              <div className="space-y-2">
                {reasons.slice(0, 4).map((reason) => (
                  <div
                    key={reason}
                    className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-700"
                  >
                    {reason.replaceAll("_", " ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm override warning */}
          {confirmed && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">
                Tap &quot;Continue anyway&quot; one more time to override the ZELTA guardrail.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-5 pt-3 space-y-2 border-t border-gray-200 bg-white">
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-600 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Protect my money — cancel this transaction
          </button>

          {onSimulate && (
            <button
              onClick={onSimulate}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <TrendingDown className="h-4 w-4" />
              Run a what-if simulation first
            </button>
          )}

          <button
            onClick={handleContinue}
            disabled={continueLoading}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-medium transition disabled:opacity-50 ${
              confirmed
                ? "border-red-200 text-red-500 hover:bg-red-50"
                : "border-gray-200 text-gray-400 hover:bg-gray-50"
            }`}
          >
            {continueLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {confirmed ? "Continue anyway (override guardrail)" : "I understand — continue anyway"}
          </button>

          <p className="text-center text-[10px] text-gray-400">
            ZELTA is a guardian, not a lock. You always decide.
          </p>
        </div>
      </div>
    </div>
  );
}