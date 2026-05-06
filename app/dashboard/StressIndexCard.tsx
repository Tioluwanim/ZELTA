"use client";
import { StressLevel } from "@/types/zelta";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface StressIndexCardProps {
  stress_index?: number;
  stress_level?: StressLevel;
  stress_label?: string;
  // Accept pre-normalised 0-100 percentages from dashboard.tsx
  bayse_primary_pct?: number;
  market_probability_pct?: number;
  loading?: boolean;
  error?: string | null;
}

function safeInt(v: number | undefined | null): number {
  const n = Number(v);
  return isNaN(n) ? 0 : Math.round(Math.min(100, Math.max(0, n)));
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
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm animate-pulse">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-9 w-9 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-24" />
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-2 bg-gray-200 rounded-full w-full" />
        <div className="flex gap-3">
          <div className="flex-1 h-14 bg-gray-200 rounded-lg" />
          <div className="flex-1 h-14 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (stress_index === undefined || stress_index === null) {
    return (
      <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <p className="font-bold uppercase text-sm">Student Stress Index</p>
          <span className="p-2 bg-green-100 rounded-lg"><TrendingDown color="green" /></span>
        </div>
        <p className="text-gray-400 text-sm">Loading stress data...</p>
      </div>
    );
  }

  // stress_index is already a 0-100 integer from /api/intelligence or /api/stress
  const stressDisplay = safeInt(stress_index);
  const crowdDisplay  = safeInt(bayse_primary_pct);      // pre-normalised 0-100
  const modelDisplay  = safeInt(market_probability_pct); // pre-normalised 0-100

  const level = stress_level ?? "CALM";
  const stressColor =
    level === "CRISIS" ? "text-red-500"
    : level === "MODERATE" ? "text-yellow-500"
    : "text-emerald-500";

  const badgeBg =
    level === "CRISIS" ? "bg-red-50 text-red-600"
    : level === "MODERATE" ? "bg-yellow-50 text-yellow-600"
    : "bg-emerald-50 text-emerald-600";

  const barColor =
    level === "CRISIS" ? "#ef4444"
    : level === "MODERATE" ? "#eab308"
    : "#22c55e";

  const Icon = level === "CRISIS" ? TrendingUp : level === "MODERATE" ? Minus : TrendingDown;
  const iconColor = level === "CRISIS" ? "red" : level === "MODERATE" ? "orange" : "green";

  return (
    <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <p className="font-bold uppercase text-sm">Student Stress Index</p>
        <span className="p-2 bg-green-100 rounded-lg">
          <Icon color={iconColor} />
        </span>
      </div>

      <h2 className={`text-3xl font-bold ${stressColor}`}>
        {stressDisplay}<span className="text-lg font-normal text-gray-400">/100</span>
      </h2>

      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${badgeBg}`}>
        {level}
      </span>

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

      <div className="flex gap-3">
        <MiniStat title="Bayse Crowd" value={`${crowdDisplay}%`} color="orange" />
        <MiniStat title="Zelta Model" value={`${modelDisplay}%`} color="green" />
      </div>
    </div>
  );
}

function MiniStat({ title, value, color }: { title: string; value: string; color: "green" | "orange" }) {
  const textColor = color === "green" ? "text-emerald-500" : "text-orange-500";
  return (
    <div className="flex-1 p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{title}</p>
      <p className={`font-semibold ${textColor}`}>{value}</p>
    </div>
  );
}