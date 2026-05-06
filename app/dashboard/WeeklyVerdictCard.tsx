"use client";

import { Target, TrendingUp } from "lucide-react";
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

const VERDICT_CONFIG: Record<string, { bg: string; heading: string; statColor: string }> = {
  INVEST: { bg: "from-emerald-500 to-emerald-700", heading: "Invest", statColor: "border-white/40" },
  SAVE:   { bg: "from-blue-500 to-blue-700",        heading: "Save",    statColor: "border-white/40" },
  HOLD:   { bg: "from-slate-500 to-slate-700",      heading: "Hold",    statColor: "border-white/40" },
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
  const key = (verdict ?? "HOLD").toUpperCase();
  const cfg = VERDICT_CONFIG[key] ?? VERDICT_CONFIG.HOLD;

  if (loading && invest_ngn === 0 && save_ngn === 0 && hold_ngn === 0) {
    return (
      <div className={`bg-gradient-to-br ${cfg.bg} text-white p-6 rounded-xl space-y-4 animate-pulse`}>
        <div className="flex gap-3 items-center">
          <Target className="h-5 w-5" />
          <div>
            <div className="h-4 bg-white/30 rounded w-40 mb-1" />
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

  // Primary amount: when verdict is SAVE show save_ngn, HOLD show hold_ngn, else invest_ngn
  const primaryAmount =
    key === "SAVE" ? save_ngn
    : key === "HOLD" ? hold_ngn
    : invest_ngn;

  return (
    <div className={`bg-gradient-to-br ${cfg.bg} text-white p-6 rounded-xl space-y-5`}>
      <div className="flex gap-3 items-start">
        <TrendingUp className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-bold uppercase tracking-wide">ZELTA Weekly Verdict</h2>
          <p className="text-sm opacity-80">Based on Bayse + Bayesian + Kelly model</p>
        </div>
      </div>

      <div>
        <p className="text-sm uppercase opacity-70 tracking-widest">Recommendation</p>
        <h3 className="text-3xl lg:text-5xl font-bold mt-1">
          {cfg.heading} ₦{primaryAmount.toLocaleString()}
        </h3>
        {allocation_plain && (
          <p className="text-sm mt-2 opacity-90 leading-relaxed">{allocation_plain}</p>
        )}
        {!allocation_plain && key === "HOLD" && (
          <p className="text-sm mt-2 opacity-80">
            Market conditions suggest holding. No strong opportunity right now.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        {key !== "SAVE" && (
          <Stat title="Save" value={`₦${(save_ngn ?? 0).toLocaleString()}`} />
        )}
        {key !== "INVEST" && (
          <Stat title="Invest" value={`₦${(invest_ngn ?? 0).toLocaleString()}`} />
        )}
        <Stat title="Hold Cash" value={`₦${(hold_ngn ?? 0).toLocaleString()}`} />
      </div>

      <button
        className="w-full bg-white/20 hover:bg-white/30 transition p-3 text-sm font-semibold rounded-xl border border-white/30"
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