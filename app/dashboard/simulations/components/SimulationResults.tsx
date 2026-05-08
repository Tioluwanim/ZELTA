"use client";
import React from "react";
import { TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";
import type {
  SimulationResponse,
  SideHustleSimResult,
  SavingsSimResult,
  WeekOutcome,
} from "@/types/zelta";

interface Props {
  result: SimulationResponse;
}

// Safe number formatter — never shows NaN or undefined
function fmt(n: unknown): string {
  const num = Number(n);
  return Number.isFinite(num) ? Math.round(num).toLocaleString() : "—";
}
function fmtDec(n: unknown, places = 1): string {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(places) : "—";
}

export default function SimulationResults({ result }: Props) {
  const { simulation_type } = result;

  // ── Side Hustle ────────────────────────────────────────────────
  if (simulation_type === "side_hustle") {
    // Cast to SideHustleSimResult — all fields are exact backend field names
    const d = result.data as SideHustleSimResult;

    return (
      <div className="mt-6 bg-white border-2 border-gray-100 rounded-2xl p-4 lg:p-6">
        {/* Header */}
        <div className="flex gap-3 items-start mb-5">
          <div className="bg-emerald-100 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-gray-800 font-bold text-lg">Simulation Results</h2>
            <p className="text-gray-500 text-sm">Simple outcome ranges from 1,000 projected scenarios</p>
          </div>
        </div>

        {/* Plain English summary — colour-coded by verdict */}
        {d.plain_english && (() => {
          const isHold = (d.verdict ?? "").toUpperCase().includes("HOLD");
          const isWarn = d.plain_english.toLowerCase().includes("crisis") ||
                         d.plain_english.toLowerCase().includes("do not invest") ||
                         d.plain_english.toLowerCase().includes("wait");
          const cls = isHold || isWarn
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800";
          return (
            <div className={`mb-5 border rounded-2xl p-4 text-sm leading-relaxed ${cls}`}>
              {d.plain_english}
              {isWarn && d.kelly_adjusted_amount === 0 && (
                <p className="mt-2 text-xs opacity-75">
                  Kelly Criterion returned 0 because expected edge is insufficient at these
                  revenue inputs. Try increasing expected revenue or reducing fixed costs.
                </p>
              )}
            </div>
          );
        })()}

        {/* Key metrics — using EXACT backend field names */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <MetricCard
            title="Kelly Allocation"
            // Backend field: kelly_adjusted_amount (not kelly_allocation)
            value={`₦${fmt(d.kelly_adjusted_amount)}`}
            sub="Safe investment amount"
            color="emerald"
          />
          <MetricCard
            title="Expected Return"
            // Backend field: expected_return_mean (not expected_return)
            value={`₦${fmt(d.expected_return_mean)}`}
            sub="Average projection"
            color="blue"
          />
          <MetricCard
            title="Decision Score"
            // Backend field: decision_score (0-5 scale, display as /5)
            value={`${fmtDec(d.decision_score)}/5`}
            sub="Decision quality"
            color="orange"
          />
        </div>

        {/* Recommended investment vs Kelly adjusted */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <MetricCard
            title="Recommended Investment"
            value={`₦${fmt(d.recommended_investment)}`}
            sub="ZELTA suggestion"
            color="slate"
          />
          <MetricCard
            title="ROI Estimate"
            value={`${fmtDec(d.roi_percentage)}%`}
            sub="Expected ROI"
            color="purple"
          />
        </div>

        {/* Stress adjusted badge */}
        {d.stress_adjusted && (
          <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-amber-700 text-sm font-medium">
              Kelly allocation was reduced due to elevated stress index
            </p>
          </div>
        )}

        {/* Monte Carlo bands — backend field: monte_carlo{p10, p50, p90} */}
        {d.monte_carlo && (
          <div className="mb-5">
            <h3 className="text-gray-800 font-bold text-sm mb-3">
              Monte Carlo Outcome Bands (1,000 simulations)
            </h3>
            <div className="space-y-2">
              {[
                { label: "Conservative (10th pct)", value: d.monte_carlo.p10, color: "red" },
                { label: "Expected (50th pct)",      value: d.monte_carlo.p50, color: "yellow" },
                { label: "Optimistic (90th pct)",    value: d.monte_carlo.p90, color: "emerald" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className={`flex justify-between items-center border rounded-2xl p-3 bg-${color}-50 border-${color}-200`}
                >
                  <span className="text-gray-700 text-sm font-medium">{label}</span>
                  <span className={`font-bold text-${color}-600`}>₦{fmt(value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500 px-1">
              <span>Chance of success: <strong>{fmtDec(d.monte_carlo.success_probability)}%</strong></span>
              <span>Std dev: <strong>₦{fmt(d.monte_carlo.std_dev)}</strong></span>
            </div>
          </div>
        )}

        {/* Sharpe score */}
        {d.sharpe_score != null && (
          <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Sharpe Score: <strong>{fmtDec(d.sharpe_score, 2)}</strong>
            <span className="text-gray-500 ml-2">
              (How stable your expected return is after risk - higher is better)
            </span>
          </div>
        )}

        {/* Verdict */}
        {d.verdict && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-gray-800 font-bold text-sm">ZELTA Verdict</h3>
                <p className="text-gray-700 text-sm mt-1">{d.verdict}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Savings ────────────────────────────────────────────────────
  if (simulation_type === "savings") {
    const d = result.data as SavingsSimResult;

    const verdictColor =
      d.verdict === "ON_TRACK"
        ? "emerald"
        : d.verdict === "REVIEW"
        ? "yellow"
        : "red";

    return (
      <div className="mt-6 bg-white border-2 border-gray-100 rounded-2xl p-4 lg:p-6">
        {/* Header */}
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
        {d.plain_english && (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 leading-relaxed">
            {d.plain_english}
          </div>
        )}

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <MetricCard
            title="Weeks to Target"
            // Backend field: weeks_to_target
            value={d.weeks_to_target != null ? `${d.weeks_to_target} wks` : "—"}
            sub="Estimated timeline"
            color="blue"
          />
          <MetricCard
            title="Weekly Surplus"
            // Backend field: weekly_surplus
            value={`₦${fmt(d.weekly_surplus)}`}
            sub="After obligations"
            color="emerald"
          />
          <MetricCard
            title="Projected Shortfall"
            // Backend field: projected_shortfall
            value={d.projected_shortfall > 0 ? `₦${fmt(d.projected_shortfall)}` : "None"}
            sub="Risk exposure"
            color={d.projected_shortfall > 0 ? "red" : "emerald"}
          />
          <MetricCard
            title="Savings Score"
            // Backend field: savings_score (0-5 scale)
            value={`${fmtDec(d.savings_score)}/5`}
            sub="Plan quality"
            color="orange"
          />
        </div>

        {/* Week summary pills */}
        <div className="flex gap-3 mb-5">
          <WeekPill label="On Track" count={d.green_weeks ?? 0} color="emerald" />
          <WeekPill label="Review"   count={d.amber_weeks ?? 0} color="yellow" />
          <WeekPill label="At Risk"  count={d.red_weeks ?? 0}   color="red" />
        </div>

        {/* obligation_risk_map — backend field (NOT weekly_trajectory) */}
        {Array.isArray(d.obligation_risk_map) && d.obligation_risk_map.length > 0 && (
          <div className="mb-5">
            <h3 className="text-gray-800 font-bold text-sm mb-3">Weekly Outlook</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(d.obligation_risk_map as WeekOutcome[]).slice(0, 16).map((w) => (
                <div
                  key={w.week}
                  className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        w.status === "green"
                          ? "bg-emerald-400"
                          : w.status === "amber"
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      }`}
                    />
                    <span className="text-gray-700 text-sm font-medium">
                      Week {w.week}
                    </span>
                  </div>
                  <div className="text-right">
                    {/* Backend field: projected_balance (not saved_amount) */}
                    <span className="text-gray-800 font-bold text-sm">
                      ₦{fmt(w.projected_balance)}
                    </span>
                    <p className="text-gray-400 text-xs capitalize">{w.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verdict */}
        {d.verdict && (
          <div
            className={`bg-${verdictColor}-50 border border-${verdictColor}-200 rounded-2xl p-4`}
          >
            <div className="flex items-start gap-2">
              <CheckCircle className={`w-5 h-5 text-${verdictColor}-500 mt-0.5 shrink-0`} />
              <div>
                <h3 className="text-gray-800 font-bold text-sm">Savings Verdict</h3>
                <p className="text-gray-700 text-sm mt-1">{d.verdict}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unknown type — debug dump
  return (
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <p className="font-bold text-amber-700 text-sm">
          Unknown simulation type: {simulation_type}
        </p>
      </div>
      <pre className="text-xs text-gray-600 overflow-auto max-h-40">
        {JSON.stringify(result.data, null, 2)}
      </pre>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

type Color = "emerald" | "blue" | "orange" | "red" | "yellow" | "slate" | "purple";

function MetricCard({
  title, value, sub, color,
}: {
  title: string; value: string; sub: string; color: Color;
}) {
  const palette: Record<Color, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-600",
    blue:    "bg-blue-50    border-blue-200    text-blue-600",
    orange:  "bg-orange-50  border-orange-200  text-orange-600",
    red:     "bg-red-50     border-red-200     text-red-600",
    yellow:  "bg-yellow-50  border-yellow-200  text-yellow-600",
    slate:   "bg-slate-50   border-slate-200   text-slate-600",
    purple:  "bg-purple-50  border-purple-200  text-purple-600",
  };
  const cls = palette[color] ?? palette.slate;
  return (
    <div className={`border rounded-2xl p-4 ${cls}`}>
      <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wide">
        {title}
      </h3>
      <p className={`font-bold text-2xl mt-1 ${cls.split(" ")[2]}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-1">{sub}</p>
    </div>
  );
}

function WeekPill({ label, count, color }: { label: string; count: number; color: Color }) {
  const bg: Record<Color, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    yellow:  "bg-yellow-100  text-yellow-700",
    red:     "bg-red-100     text-red-700",
    blue:    "bg-blue-100    text-blue-700",
    orange:  "bg-orange-100  text-orange-700",
    slate:   "bg-slate-100   text-slate-700",
    purple:  "bg-purple-100  text-purple-700",
  };
  return (
    <div className={`flex-1 rounded-2xl p-3 text-center ${bg[color] ?? bg.slate}`}>
      <p className="font-bold text-lg">{count}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}