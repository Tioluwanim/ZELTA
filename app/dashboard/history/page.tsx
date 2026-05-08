"use client";

import React from "react";
import PageHeader from "@/components/PageHeader";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { usePortfolio } from "@/hooks/zelta";

// ─── Types ───────────────────────────────────────────────

type OutcomeStatus = "correct" | "incorrect" | "pending";

// ─── Sub-components ──────────────────────────────────────

function StatusBadge({ status }: { status: OutcomeStatus }) {
  if (status === "correct") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        <CheckCircle className="h-3.5 w-3.5" />
        Your decision worked well
      </span>
    );
  }

  if (status === "incorrect") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
        <XCircle className="h-3.5 w-3.5" />
        This decision underperformed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
      <Clock className="h-3.5 w-3.5" />
      Still monitoring results
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
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
      <Clock className="h-5 w-5 text-orange-500" />
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    INVEST: "bg-green-50 text-green-700",
    SAVE: "bg-blue-50 text-blue-700",
    HOLD: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
        colors[verdict] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {verdict}
    </span>
  );
}

function StatCard({
  label,
  value,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold lg:text-2xl ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function DecisionHistoryPage() {
  const portfolio = usePortfolio();

  if (portfolio.loading) {
    return (
      <div className="pb-10">
        <PageHeader
          title="Decision History"
          description="Every ZELTA recommendation logged with outcome tracking"
        />
        <div className="mt-6 h-64 animate-pulse rounded-2xl border border-gray-100 bg-white p-6" />
      </div>
    );
  }

  if (portfolio.error || !portfolio.data) {
    return (
      <div className="pb-10">
        <PageHeader
          title="Decision History"
          description="Every ZELTA recommendation logged with outcome tracking"
        />
        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          Failed to load portfolio data. {portfolio.error}
        </div>
      </div>
    );
  }

  const { metrics, recent_decisions: decisions } = portfolio.data;

  return (
    <div className="pb-10">
      <PageHeader
        title="Decision History"
        description="Every ZELTA recommendation logged with outcome tracking"
      />

      {/* Performance */}
      <div className="mt-6 rounded-2xl bg-green-50 p-5 lg:p-6">
        <h2 className="mb-5 font-bold text-gray-800">
          Your BQ Performance
        </h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Decisions"
            value={String(metrics.total_decisions)}
          />
          <StatCard
            label="ZELTA Accuracy"
            value={`${Math.round(metrics.accuracy_rate * 100)}%`}
            valueColor="text-[#10b981]"
          />
          <StatCard
            label="Avg Decision Score"
            value={`${metrics.average_decision_score.toFixed(2)}/5.0`}
          />
          <StatCard
            label="Net P&L"
            value={`₦${metrics.net_pnl.toLocaleString()}`}
            valueColor={
              metrics.net_pnl > 0 ? "text-[#10b981]" : "text-red-500"
            }
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-gray-800">
          Timeline
        </h2>

        {decisions.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              No decisions logged yet. Start making decisions to build your track record!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.map((decision) => {
              const status =
                (decision.outcome_label?.toLowerCase() as OutcomeStatus) ||
                "pending";

              const daysTracked =
                decision.resolved_at
                  ? Math.floor(
                      (new Date(decision.resolved_at).getTime() -
                        new Date(decision.created_at).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;

              return (
                <div
                  key={decision.id}
                  className="flex items-start gap-4 rounded-2xl bg-green-50 p-4 lg:p-5"
                >
                  <StatusIcon status={status} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 lg:text-base">
                          {decision.category || "Decision"}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {new Date(
                            decision.created_at
                          ).toLocaleDateString()}{" "}
                          • {decision.rationale}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={status} />
                        <span className="text-[11px] text-gray-500">
                          {status === "correct"
                            ? "Outcome matched your plan."
                            : status === "incorrect"
                            ? "Result came in below expectation."
                            : "Decision is still unfolding."}
                        </span>
                        {daysTracked !== null && (
                          <span className="text-xs text-gray-400">
                            {daysTracked} days tracked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <VerdictPill verdict={decision.verdict} />

                      <span className="text-sm font-semibold text-gray-800">
                        ₦{decision.amount.toLocaleString()}
                      </span>

                      {decision.return_amount !== null && (
                        <span className="text-xs text-gray-500">
                          →{" "}
                          {decision.return_percentage &&
                          decision.return_percentage > 0
                            ? "+"
                            : ""}
                          ₦{(decision.return_amount ?? 0).toLocaleString()} (
                          {decision.return_percentage?.toFixed(1) || "0"}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}