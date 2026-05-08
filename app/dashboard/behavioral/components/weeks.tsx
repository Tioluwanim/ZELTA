"use client";

import { useBehavioralDataContext } from "@/context/BehavioralSnapshotContext";
import { DEFAULT_BEHAVIORAL_PATTERN } from "@/hooks/zelta";
import { LoadingState } from "@/components/ui/State";

export default function Weeks() {
  const { pattern, loading } = useBehavioralDataContext();
  const data = pattern ?? DEFAULT_BEHAVIORAL_PATTERN;

  if (loading) return <LoadingState text="Loading 8-week pattern..." />;

  const weeks = Array.isArray(data.weeks) ? data.weeks : [];

  const getBgColor = (bias: string) => {
    switch (bias?.toLowerCase()) {
      case "loss aversion":
      case "present bias":
      case "herd behavior":
      case "overconfidence":
        return "bg-orange-400";
      case "none":
      case "rational":
        return "bg-emerald-500";
      default:
        return "bg-gray-400";
    }
  };

  const getTextColor = (bias: string) => {
    switch (bias?.toLowerCase()) {
      case "none":
      case "rational":
        return "text-emerald-600 bg-emerald-50";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div className="mt-3 w-full rounded-2xl border border-gray-100 bg-white p-5 lg:ml-5">
      <h1 className="text-2xl font-bold text-gray-800">8-Week Behavioral Pattern</h1>

      {weeks.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
          No weekly pattern data yet. ZELTA will show the last 8 weeks here
          once enough history is available.
        </div>
      ) : (
        <section className="mt-6 space-y-4">
          {weeks.slice(0, 8).map((weekData, index) => {
            // FIX: strength is ALREADY 0-100 from behavioral_service.py:
            //   _bias_to_week_strength(avg_score) = max(0, min(100, score * 20))
            // Previous code: Math.round((weekData.strength ?? 0) * 100) → WRONG
            // Remove *100 — just clamp to 0-100.
            const strengthPct = Math.min(
              100,
              Math.max(0, Math.round(Number(weekData.strength ?? 0)))
            );

            return (
              <div key={index} className="flex items-center gap-3">
                <h3 className="w-14 shrink-0 text-sm text-gray-500">
                  Wk {weekData.week}
                </h3>

                <div className="h-10 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`flex h-full items-center rounded-full text-sm font-bold text-white transition-all duration-700 ${getBgColor(weekData.bias)}`}
                    style={{ width: `${Math.max(strengthPct, 10)}%` }}
                  >
                    <span className="ml-3 whitespace-nowrap text-xs">
                      {weekData.bias}
                    </span>
                  </div>
                </div>

                <p className={`shrink-0 text-sm font-bold ${getTextColor(weekData.bias)}`}>
                  {strengthPct}%
                </p>
              </div>
            );
          })}

          {/* Pattern summary */}
          {data.dominant_bias && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Dominant Pattern
              </p>
              <p className="mt-1 font-bold text-gray-800">{data.dominant_bias}</p>
              {data.summary && (
                <p className="mt-1 text-sm text-gray-500">{data.summary}</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}