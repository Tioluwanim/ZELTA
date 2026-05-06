import React from "react";
import { TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";
import type { SimulationResponse } from "@/types/zelta";

interface SimulationResultsProps {
  result: SimulationResponse;
}

function fmt(n: unknown): string {
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString() : "—";
}

export default function SimulationResults({ result }: SimulationResultsProps) {
  const { data, simulation_type } = result;

  // The backend may return various field names. Normalise defensively.
  // kelly_allocation may come as invest_amount, kelly_amount, or kelly_allocation
  const kellyAlloc =
    (data.kelly_allocation as number) ??
    (data.invest_amount as number) ??
    (data.kelly_amount as number) ??
    null;

  // expected_return may be expected_return or mean_return
  const expectedReturn =
    (data.expected_return as number) ??
    (data.mean_return as number) ??
    null;

  const confidenceScore =
    (data.confidence_score as number) ??
    (data.decision_score as number) ??
    null;

  if (simulation_type === "side_hustle") {
    return (
      <div className="mt-6 bg-white border-2 border-gray-100 rounded-2xl p-4 lg:p-6">
        <div className="flex gap-3 items-start mb-5">
          <div className="bg-emerald-100 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-gray-800 font-bold text-lg">Simulation Results</h2>
            <p className="text-gray-500 text-sm">Bayesian Monte Carlo projection</p>
          </div>
        </div>

        {/* Plain English summary */}
        {data.plain_english && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 leading-relaxed">
            {String(data.plain_english)}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Kelly Allocation</h3>
            <p className="text-emerald-600 font-bold text-2xl mt-1">
              {kellyAlloc != null ? `₦${fmt(kellyAlloc)}` : "—"}
            </p>
            <p className="text-gray-500 text-xs mt-1">Safe investment amount</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Expected Return</h3>
            <p className="text-blue-600 font-bold text-2xl mt-1">
              {expectedReturn != null ? `₦${fmt(expectedReturn)}` : "—"}
            </p>
            <p className="text-gray-500 text-xs mt-1">Average projection</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Confidence Score</h3>
            <p className="text-orange-600 font-bold text-2xl mt-1">
              {confidenceScore != null ? `${Math.round(Number(confidenceScore))}%` : "—"}
            </p>
            <p className="text-gray-500 text-xs mt-1">Decision quality</p>
          </div>
        </div>

        {/* Kelly fraction */}
        {data.kelly_fraction != null && (
          <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Kelly fraction: <strong>{(Number(data.kelly_fraction) * 100).toFixed(1)}%</strong> of free cash
          </div>
        )}

        {/* Probability Bands */}
        {data.probability_bands && (
          <div className="mb-5">
            <h3 className="text-gray-800 font-bold text-sm mb-3">Outcome Probability Bands</h3>
            <div className="space-y-2">
              {[
                { label: "Conservative (25th pct)", key: "low",    color: "text-red-600",    bg: "bg-red-50 border-red-200" },
                { label: "Expected (50th pct)",     key: "medium", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
                { label: "Optimistic (75th pct)",   key: "high",   color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
              ].map(({ label, key, color, bg }) => (
                <div key={key} className={`flex justify-between items-center border rounded-2xl p-3 ${bg}`}>
                  <span className="text-gray-700 text-sm font-medium">{label}</span>
                  <span className={`font-bold ${color}`}>
                    ₦{fmt((data.probability_bands as Record<string, number>)[key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {data.recommendation && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-gray-800 font-bold text-sm">ZELTA Recommendation</h3>
                <p className="text-gray-700 text-sm mt-1">{String(data.recommendation)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (simulation_type === "savings") {
    const weeksToTarget = data.weeks_to_target as number | null;
    const riskLevel = (data.risk_level as string) || "low";

    const riskColor =
      riskLevel === "red" || riskLevel === "high" ? "text-red-600"
      : riskLevel === "amber" || riskLevel === "medium" ? "text-yellow-600"
      : "text-emerald-600";

    return (
      <div className="mt-6 bg-white border-2 border-gray-100 rounded-2xl p-4 lg:p-6">
        <div className="flex gap-3 items-start mb-5">
          <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-gray-800 font-bold text-lg">Savings Projection</h2>
            <p className="text-gray-500 text-sm">Week-by-week trajectory</p>
          </div>
        </div>

        {/* Plain English */}
        {data.plain_english && (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 leading-relaxed">
            {String(data.plain_english)}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Weeks to Target</h3>
            <p className="text-blue-600 font-bold text-2xl mt-1">
              {weeksToTarget != null ? `${weeksToTarget} wks` : "—"}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Risk Level</h3>
            <p className={`font-bold text-2xl mt-1 capitalize ${riskColor}`}>{riskLevel}</p>
          </div>
        </div>

        {/* Weekly Trajectory */}
        {Array.isArray(data.weekly_trajectory) && data.weekly_trajectory.length > 0 && (
          <div className="mb-5">
            <h3 className="text-gray-800 font-bold text-sm mb-3">Weekly Progress</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(data.weekly_trajectory as Array<{ week: number; saved_amount: number; risk_status: string; notes?: string }>)
                .slice(0, 12)
                .map((week) => (
                <div key={week.week} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      week.risk_status === "green" ? "bg-emerald-400"
                      : week.risk_status === "amber" ? "bg-yellow-400"
                      : "bg-red-400"
                    }`} />
                    <span className="text-gray-700 text-sm font-medium">Week {week.week}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-800 font-bold text-sm">₦{fmt(week.saved_amount)}</span>
                    {week.notes && <p className="text-gray-400 text-xs">{week.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.recommendation && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-gray-800 font-bold text-sm">Savings Strategy</h3>
                <p className="text-gray-700 text-sm mt-1">{String(data.recommendation)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unknown simulation type — show raw JSON for debugging
  return (
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <p className="font-bold text-amber-700 text-sm">Simulation completed (unknown type: {simulation_type})</p>
      </div>
      <pre className="text-xs text-gray-600 overflow-auto max-h-40">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}