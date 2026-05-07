"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Verdict } from "@/types/zelta";

interface VerdictProp {
  verdict?: Verdict | string;
  invest_ngn: number;
  save_ngn: number;
  hold_ngn: number;
  allocation_plain: string;
  loading?: boolean;
}

type VerdictKey = "INVEST" | "SAVE" | "HOLD";

const CONFIG: Record<VerdictKey, {
  gradient: string;
  label: string;
  icon: React.ElementType;
  primaryField: "invest_ngn" | "save_ngn" | "hold_ngn";
}> = {
  INVEST: {
    gradient: "from-emerald-500 to-emerald-700",
    label: "Invest",
    icon: TrendingUp,
    primaryField: "invest_ngn",
  },
  SAVE: {
    gradient: "from-blue-500 to-blue-700",
    label: "Save",
    icon: TrendingDown,
    primaryField: "save_ngn",
  },
  HOLD: {
    gradient: "from-slate-500 to-slate-700",
    label: "Hold",
    icon: Minus,
    primaryField: "hold_ngn",
  },
};

export default function WeeklyVerdictCard({
  verdict = "HOLD",
  invest_ngn,
  save_ngn,
  hold_ngn,
  allocation_plain,
  loading = false,
}: VerdictProp) {
  const navigate = useRouter();

  const key = (verdict ?? "HOLD").toUpperCase() as VerdictKey;
  const cfg = CONFIG[key] ?? CONFIG.HOLD;
  const Icon = cfg.icon;

  const amounts = { invest_ngn, save_ngn, hold_ngn };
  const primaryAmount = amounts[cfg.primaryField] ?? 0;

  // Build secondary stats: show only the other two, but only if non-zero
  const secondaryStats = (
    [
      { title: "Invest",    value: invest_ngn, key: "invest_ngn" },
      { title: "Save",      value: save_ngn,   key: "save_ngn" },
      { title: "Hold Cash", value: hold_ngn,   key: "hold_ngn" },
    ] as { title: string; value: number; key: string }[]
  ).filter((s) => s.key !== cfg.primaryField && s.value > 0);

  /* ── Loading skeleton ── */
  if (loading && primaryAmount === 0 && invest_ngn === 0 && save_ngn === 0 && hold_ngn === 0) {
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
        <div className="flex gap-3">
          <div className="flex-1 h-16 bg-white/20 rounded-lg" />
          <div className="flex-1 h-16 bg-white/20 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${cfg.gradient} text-white p-6 rounded-xl space-y-5`}>
      {/* Header */}
      <div className="flex gap-3 items-start">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-bold uppercase tracking-wide text-sm">
            ZELTA Weekly Verdict
          </h2>
          <p className="text-xs opacity-80">
            Based on Bayse + Bayesian + Kelly model
          </p>
        </div>
      </div>

      {/* Primary recommendation */}
      <div>
        <p className="text-xs uppercase opacity-70 tracking-widest">
          Recommendation
        </p>
        <h3 className="text-3xl lg:text-5xl font-bold mt-1">
          {cfg.label} ₦{primaryAmount.toLocaleString()}
        </h3>

        {/* Show allocation_plain only if it's not just repeating the number */}
        {allocation_plain && !allocation_plain.startsWith(`${cfg.label} ₦${primaryAmount}`) && (
          <p className="text-sm mt-2 opacity-90 leading-relaxed">
            {allocation_plain}
          </p>
        )}
        {/* Default hold message when AI returns zero secondary amounts */}
        {key === "HOLD" && !allocation_plain && (
          <p className="text-sm mt-2 opacity-80">
            Market conditions suggest holding. Monitor Bayse signals before deploying capital.
          </p>
        )}
      </div>

      {/* Secondary stats — only shown when non-zero */}
      {secondaryStats.length > 0 ? (
        <div className="flex gap-3">
          {secondaryStats.map((s) => (
            <Stat key={s.key} title={s.title} value={`₦${s.value.toLocaleString()}`} />
          ))}
        </div>
      ) : (
        /* When all secondary amounts are zero (e.g. pure HOLD with no split),
           show the allocation notes instead */
        allocation_plain ? (
          <p className="text-sm opacity-85 leading-relaxed border border-white/20 rounded-lg p-3">
            {allocation_plain}
          </p>
        ) : null
      )}

      <button
        className="w-full bg-white/20 hover:bg-white/30 active:bg-white/40 transition p-3 text-sm font-semibold rounded-xl border border-white/30"
        onClick={() => navigate.push("/dashboard/simulations")}
      >
        Run Full Simulation
      </button>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex-1 border border-white/40 p-3 rounded-lg">
      <p className="text-xs uppercase opacity-70">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}