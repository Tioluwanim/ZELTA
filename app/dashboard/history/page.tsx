"use client";

import React from "react";
import PageHeader from "@/components/PageHeader";
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  BarChart2,
  Award,
} from "lucide-react";
import { usePortfolio } from "@/hooks/zelta";

type OutcomeStatus = "correct" | "incorrect" | "pending";

interface Decision {
  outcome_status?: OutcomeStatus;
  verdict?: string;
  plain_english?: string;
  date?: string;
  amount_ngn?: number;
  stress_index_at_decision?: number;
  outcome_pnl?: number;
}

interface PortfolioData {
  decisions: Decision[];
  net_pnl: number;
}

// Map raw backend verdict strings to student-friendly labels
const VERDICT_LABELS: Record<string, string> = {
  INVEST: "Spend Safely",
  SPEND_SAFELY: "Spend Safely",
  SAVE: "Protect",
  PROTECT: "Protect",
  HOLD: "Hold",
};

const VERDICT_COLORS: Record<string, string> = {
  INVEST: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SPEND_SAFELY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SAVE: "bg-blue-50 text-blue-700 border-blue-200",
  PROTECT: "bg-blue-50 text-blue-700 border-blue-200",
  HOLD: "bg-gray-100 text-gray-600 border-gray-200",
};

function StatusBadge({ status }: { status: OutcomeStatus }) {
  if (status === "correct") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
        <CheckCircle className="h-3 w-3" /> Worked well
      </span>
    );
  }

  if (status === "incorrect") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600">
        <XCircle className="h-3 w-3" /> Underperformed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-600">
      <Clock className="h-3 w-3" /> Monitoring
    </span>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  const label = VERDICT_LABELS[verdict] ?? verdict;

  const color =
    VERDICT_COLORS[verdict] ??
    "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <span
      className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      {label}
    </span>
  );
}

function StatusIcon({ status }: { status: OutcomeStatus }) {
  if (status === "correct") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-5 w-5 text-green-500" />
      </div>
    );
  }

  if (status === "incorrect") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-5 w-5 text-red-500" />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
      <Clock className="h-5 w-5 text-amber-500" />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-70" />
        <p className="text-xs font-medium opacity-70">{label}</p>
      </div>

      <p className="text-2xl font-bold">{value}</p>

      {sub && <p className="mt-0.5 text-xs opacity-60">{sub}</p>}
    </div>
  );
}

export default function HistoryPage() {
  const portfolio = usePortfolio();

  // SAFE TYPED DATA
  const data = (portfolio.data ?? {}) as PortfolioData;

  const decisions: Decision[] = data.decisions ?? [];

  const correct = decisions.filter(
    (d) => d.outcome_status === "correct"
  ).length;

  const incorrect = decisions.filter(
    (d) => d.outcome_status === "incorrect"
  ).length;

  const pending = decisions.filter(
    (d) => d.outcome_status === "pending"
  ).length;

  const accuracy =
    decisions.length > 0
      ? Math.round((correct / decisions.length) * 100)
      : 0;

  const netPnl = data.net_pnl ?? 0;

  return (
    <div className="px-3 pb-10 lg:px-0">
      <PageHeader
        title="Past Decisions"
        description="How your ZELTA recommendations played out"
      />

      {/* ── Summary stats ── */}
      {!portfolio.loading && decisions.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Accuracy"
            value={`${accuracy}%`}
            sub={`${correct} of ${decisions.length} correct`}
            icon={Award}
            color="border-emerald-200 bg-emerald-50 text-emerald-700"
          />

          <StatCard
            label="Total Decisions"
            value={String(decisions.length)}
            sub={`${pending} still tracking`}
            icon={BarChart2}
            color="border-gray-200 bg-white text-gray-700"
          />

          <StatCard
            label="Net P&L"
            value={`${
              netPnl >= 0 ? "+" : ""
            }₦${Math.abs(netPnl).toLocaleString()}`}
            sub="vs doing nothing"
            icon={TrendingUp}
            color={
              netPnl >= 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }
          />

          <StatCard
            label="Monitoring"
            value={String(pending)}
            sub="outcomes still pending"
            icon={Clock}
            color="border-amber-200 bg-amber-50 text-amber-700"
          />
        </div>
      )}

      {/* ── Loading ── */}
      {portfolio.loading && (
        <div className="mt-5 animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {portfolio.error && !portfolio.loading && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">
            Failed to load history
          </p>

          <p className="mt-1 text-xs text-red-500">
            {portfolio.error}
          </p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!portfolio.loading &&
        !portfolio.error &&
        decisions.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <BarChart2 className="h-8 w-8 text-gray-300" />
            </div>

            <p className="text-base font-semibold text-gray-700">
              No decisions yet
            </p>

            <p className="max-w-xs text-sm text-gray-400">
              ZELTA will log every recommendation here. Keep using
              the app and your decision history will build up over
              time.
            </p>
          </div>
        )}

      {/* ── Decision list ── */}
      {!portfolio.loading && decisions.length > 0 && (
        <div className="mt-5 space-y-3">
          {decisions.map((d, i) => {
            const status = (d.outcome_status ??
              "pending") as OutcomeStatus;

            const date = d.date
              ? new Date(d.date).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—";

            const amount = d.amount_ngn
              ? `₦${Number(d.amount_ngn).toLocaleString()}`
              : null;

            return (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <StatusIcon status={status} />

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {d.verdict && (
                        <VerdictPill verdict={d.verdict} />
                      )}

                      {amount && (
                        <span className="text-sm font-bold text-gray-800">
                          {amount}
                        </span>
                      )}
                    </div>

                    {d.plain_english && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
                        {d.plain_english}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={status} />

                      <span className="text-xs text-gray-400">
                        {date}
                      </span>

                      {d.stress_index_at_decision != null && (
                        <span className="text-xs text-gray-400">
                          Panic:{" "}
                          {Math.round(
                            d.stress_index_at_decision
                          )}
                          /100
                        </span>
                      )}
                    </div>

                    {d.outcome_pnl != null &&
                      d.outcome_pnl !== 0 && (
                        <p
                          className={`mt-1.5 text-xs font-bold ${
                            d.outcome_pnl > 0
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          {d.outcome_pnl > 0 ? "+" : ""}
                          ₦
                          {Math.abs(
                            d.outcome_pnl
                          ).toLocaleString()}{" "}
                          vs doing nothing
                        </p>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}