"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Banknote, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Verdict } from "@/types/zelta";

interface VerdictProp {
  verdict?: Verdict | string;
  student_verdict?: string;         // SPEND_SAFELY | PROTECT | HOLD — from new backend
  invest_ngn: number;
  save_ngn: number;
  hold_ngn: number;
  spend_safely_ngn?: number;        // student alias
  protect_ngn?: number;             // student alias
  allocation_plain: string;
  loading?: boolean;
  // student_model survival signals
  agent_mode?: "EMERGENCY" | "SURVIVAL" | "NORMAL" | string;
  survival_score?: number;
  weeks_of_runway?: number;
  fee_gap_ngn?: number;
  status_message?: string;
  safe_discretionary_ngn?: number;
}

type VerdictKey = "INVEST" | "SAVE" | "HOLD" | "SPEND_SAFELY" | "PROTECT";

const CONFIG: Record<VerdictKey, {
  gradient: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  primaryField: "invest_ngn" | "save_ngn" | "hold_ngn";
}> = {
  INVEST: {
    gradient:    "from-emerald-500 to-emerald-700",
    label:       "Spend Safely",
    sublabel:    "Safe discretionary amount this week",
    icon:        Banknote,
    primaryField:"invest_ngn",
  },
  SPEND_SAFELY: {
    gradient:    "from-emerald-500 to-emerald-700",
    label:       "Spend Safely",
    sublabel:    "Safe discretionary amount this week",
    icon:        Banknote,
    primaryField:"invest_ngn",
  },
  SAVE: {
    gradient:    "from-blue-500 to-blue-700",
    label:       "Protect This",
    sublabel:    "Set this aside — don't spend it",
    icon:        ShieldCheck,
    primaryField:"save_ngn",
  },
  PROTECT: {
    gradient:    "from-blue-500 to-blue-700",
    label:       "Protect This",
    sublabel:    "Set this aside — don't spend it",
    icon:        ShieldCheck,
    primaryField:"save_ngn",
  },
  HOLD: {
    gradient:    "from-slate-500 to-slate-700",
    label:       "Hold",
    sublabel:    "Don't make any big money moves now",
    icon:        Minus,
    primaryField:"hold_ngn",
  },
};

export default function WeeklyVerdictCard({
  verdict = "HOLD",
  student_verdict,
  invest_ngn,
  save_ngn,
  hold_ngn,
  spend_safely_ngn,
  protect_ngn,
  allocation_plain,
  loading = false,
  agent_mode,
  survival_score,
  weeks_of_runway,
  fee_gap_ngn,
  status_message,
  safe_discretionary_ngn,
}: VerdictProp) {
  const navigate = useRouter();

  // Prefer student_verdict (new pipeline) over raw verdict
  const effectiveVerdict = (student_verdict || verdict || "HOLD").toUpperCase() as VerdictKey;
  const cfg = CONFIG[effectiveVerdict] ?? CONFIG.HOLD;
  const Icon = cfg.icon;

  // Use student-friendly aliases when available
  const primaryAmount = effectiveVerdict === "INVEST" || effectiveVerdict === "SPEND_SAFELY"
    ? (spend_safely_ngn ?? invest_ngn)
    : effectiveVerdict === "SAVE" || effectiveVerdict === "PROTECT"
      ? (protect_ngn ?? save_ngn)
      : hold_ngn;

  const formattedAmount = (primaryAmount ?? 0).toLocaleString();

  const isEmergency = agent_mode === "EMERGENCY";
  const isSurvival  = agent_mode === "SURVIVAL";
  const hasRunway   = weeks_of_runway != null && weeks_of_runway < 4;

  const plainIsRedundant =
    !!allocation_plain &&
    allocation_plain.startsWith(`${cfg.label} ₦${formattedAmount}`);

  /* ── Loading skeleton ── */
  if (loading && !invest_ngn && !save_ngn && !hold_ngn) {
    return (
      <div className={`bg-gradient-to-br ${cfg.gradient} text-white p-6 rounded-xl space-y-4 animate-pulse`}>
        <div className="flex gap-3 items-center">
          <div className="h-5 w-5 bg-white/30 rounded" />
          <div className="space-y-1">
            <div className="h-4 bg-white/30 rounded w-40" />
            <div className="h-3 bg-white/20 rounded w-56" />
          </div>
        </div>
        <div className="h-12 bg-white/20 rounded w-48" />
        <div className="h-4 bg-white/20 rounded w-full" />
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${cfg.gradient} text-white p-6 rounded-xl space-y-5`}>

      {/* Emergency / Survival alert banner */}
      {(isEmergency || isSurvival) && (
        <div className="flex items-start gap-2 rounded-xl bg-white/20 border border-white/30 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed">
            {isEmergency
              ? `⚠️ Money runs out in ${weeks_of_runway?.toFixed(1)} weeks. Cut all non-essential spending now.`
              : `Fee shortfall: ₦${(fee_gap_ngn ?? 0).toLocaleString()}. Prioritise saving for upcoming obligations.`}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex gap-3 items-start">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-bold uppercase tracking-wide text-sm">Weekly Recommendation</h2>
          <p className="text-xs opacity-80">Your practical next step for this week</p>
        </div>

        {/* Survival score pill */}
        {survival_score != null && (
          <div className="ml-auto shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
            Score {survival_score}/100
          </div>
        )}
      </div>

      {/* Primary recommendation */}
      <div>
        <p className="text-xs uppercase opacity-70 tracking-widest">Do this today</p>
        <h3 className="text-3xl lg:text-5xl font-bold mt-1">
          {cfg.label} ₦{formattedAmount}
        </h3>
        <p className="text-xs opacity-70 mt-1">{cfg.sublabel}</p>

        {/* ZELTA status message from student_model — always show when available */}
        {status_message && !isEmergency && !isSurvival && (
          <p className="text-sm mt-2 opacity-90 leading-relaxed">{status_message}</p>
        )}

        {/* allocation_plain only when it adds new info */}
        {allocation_plain && !plainIsRedundant && !status_message && (
          <p className="text-sm mt-2 opacity-90 leading-relaxed">{allocation_plain}</p>
        )}

        {/* Fallback for pure HOLD */}
        {effectiveVerdict === "HOLD" && !allocation_plain && !status_message && (
          <p className="text-sm mt-2 opacity-80">
            Hold your money for now. Conditions aren't right to act — wait for a calmer signal.
          </p>
        )}
      </div>

      {/* Safe discretionary from student_model — shows how much is okay to spend */}
      {safe_discretionary_ngn != null && safe_discretionary_ngn > 0 && effectiveVerdict !== "HOLD" && (
        <div className="flex items-center justify-between rounded-xl border border-white/30 bg-white/15 px-4 py-3">
          <p className="text-xs opacity-80">Safe weekly spend</p>
          <p className="font-bold text-sm">₦{safe_discretionary_ngn.toLocaleString()}</p>
        </div>
      )}

      {/* Runway indicator */}
      {weeks_of_runway != null && weeks_of_runway < 8 && (
        <div className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2">
          <div className={`h-2 w-2 rounded-full ${weeks_of_runway < 2 ? "bg-red-400" : weeks_of_runway < 4 ? "bg-amber-400" : "bg-green-400"}`} />
          <p className="text-xs opacity-90">
            Money lasts <span className="font-bold">{weeks_of_runway.toFixed(1)} weeks</span> at current spending pace
          </p>
        </div>
      )}

      <button
        className="w-full bg-white/20 hover:bg-white/30 active:bg-white/40 transition p-3 text-sm font-semibold rounded-xl border border-white/30"
        onClick={() => navigate.push("/dashboard/simulations")}
      >
        See plan details
      </button>
    </div>
  );
}