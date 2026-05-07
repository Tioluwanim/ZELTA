"use client";
import { StressLevel } from "@/types/zelta";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface StressIndexCardProps {
  stress_index?: number;
  stress_level?: StressLevel;
  stress_label?: string;
  // These arrive pre-normalised as 0-100 integers from dashboard.tsx.
  // bayse_primary_pct  = crowd fear  (bayseFearPct)
  // market_probability_pct = ZELTA model = 100 - crowd fear
  bayse_primary_pct?: number;
  market_probability_pct?: number;
  loading?: boolean;
  error?: string | null;
}

function safe(v: number | undefined | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : 0;
}

export default function StressIndexCard({
  stress_index,
  stress_level,
  stress_label,
  bayse_primary_pct,
  market_probability_pct,
  loading = false,
  error = null,
}: StressIndexCardProps) {
  /* ── Loading ── */
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm animate-pulse">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-9 w-9 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-24" />
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-2 bg-gray-200 rounded-full" />
        <div className="flex gap-3">
          <div className="flex-1 h-14 bg-gray-200 rounded-lg" />
          <div className="flex-1 h-14 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  /* ── No data ── */
  if (stress_index == null) {
    return (
      <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <p className="font-bold uppercase text-sm">Student Stress Index</p>
          <span className="p-2 bg-emerald-100 rounded-lg">
            <TrendingDown color="green" />
          </span>
        </div>
        <p className="text-gray-400 text-sm">Awaiting stress data…</p>
      </div>
    );
  }

  const stressDisplay = safe(stress_index);
  // Crowd fear and ZELTA model are already 0-100 from dashboard.tsx
  const crowdFear  = safe(bayse_primary_pct);
  const zeltaModel = safe(market_probability_pct);

  const level = stress_level ?? "CALM";

  const stressColor =
    level === "CRISIS" || level === "HIGH_STRESS" ? "text-red-500"
    : level === "MODERATE" ? "text-yellow-500"
    : "text-emerald-500";

  const badgeBg =
    level === "CRISIS" || level === "HIGH_STRESS" ? "bg-red-50 text-red-600"
    : level === "MODERATE" ? "bg-yellow-50 text-yellow-600"
    : "bg-emerald-50 text-emerald-600";

  const barColor =
    level === "CRISIS" || level === "HIGH_STRESS" ? "#ef4444"
    : level === "MODERATE" ? "#eab308"
    : "#22c55e";

  const Icon =
    level === "CRISIS" || level === "HIGH_STRESS" ? TrendingUp
    : level === "MODERATE" ? Minus
    : TrendingDown;
  const iconColor =
    level === "CRISIS" || level === "HIGH_STRESS" ? "red"
    : level === "MODERATE" ? "orange"
    : "green";

  return (
    <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <p className="font-bold uppercase text-sm">Student Stress Index</p>
        <span className="p-2 bg-emerald-100 rounded-lg">
          <Icon color={iconColor} />
        </span>
      </div>

      <h2 className={`text-3xl font-bold ${stressColor}`}>
        {stressDisplay}
        <span className="text-lg font-normal text-gray-400">/100</span>
      </h2>

      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${badgeBg}`}>
        {level}
      </span>

      {/* Progress bar — shows the combined stress index */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Bayse Primary Signal</span>
          <span>{stressDisplay}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{ width: `${stressDisplay}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {stress_label && (
        <p className="text-xs text-gray-500 leading-relaxed">{stress_label}</p>
      )}

      {/* MiniStats:
            Bayse Crowd = what the crowd is pricing in (crowd_stress from /api/bayse/stress)
            Zelta Model = rational complement = 100 - crowd fear
      */}
      <div className="flex gap-3">
        <MiniStat
          title="Bayse Crowd"
          value={`${crowdFear}%`}
          color="orange"
          tooltip="Crowd fear signal from Bayse prediction market"
        />
        <MiniStat
          title="Zelta Model"
          value={`${zeltaModel}%`}
          color="green"
          tooltip="Rational model probability (100 − crowd fear)"
        />
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "green" | "orange";
  tooltip?: string;
}) {
  const textColor = color === "green" ? "text-emerald-500" : "text-orange-500";
  return (
    <div className="flex-1 p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{title}</p>
      <p className={`font-semibold ${textColor}`}>{value}</p>
    </div>
  );
}