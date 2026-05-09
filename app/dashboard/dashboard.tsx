"use client";
import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ErrorBanner from "@/components/ErrorBanner";
import DashboardOverlay from "@/components/DashboardOverlay";
import BiasAlertCard from "@/app/dashboard/BiasAlertCard";
import MarketAlert from "@/app/dashboard/MarketAlert";
import WeeklyVerdictCard from "@/app/dashboard/WeeklyVerdictCard";
import DecisionScoreCard from "./DecisionScoreCard";
import StressIndexCard from "./StressIndexCard";
import { useZelta } from "@/context/zeltaContext";

const hour = new Date().getHours();
const greeting =
  hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

function Dashboard() {
  const { intelligence, globalError, globalLoading, retryAll, profile, bayse } =
    useZelta();
  const [errorDismissed, setErrorDismissed] = useState(false);

  const intel = intelligence.data;

  // ── Stress values — use /api/intelligence exclusively ────────────
  // /api/stress calls fetch_stress_signal() which uses the raw Bayse score (22.4)
  // as combined_index instead of the brain pipeline's combined_index (13).
  // /api/intelligence runs the full brain pipeline and returns the correct
  // stress_index=13 and stress_level=CALM.
  // Always prefer intel.data to avoid the stale/wrong stress signal.
  const stressIndex = intel?.stress_index;
  const stressLevel = intel?.stress_level;
  const stressLabel = intel?.stress_label;

  // ── Bayse Fear % ─────────────────────────────────────────────────
  // /api/bayse/stress returns crowd_stress (0-100) — most accurate fear signal.
  // /api/intelligence crowd_yes = crowd_yes_price (0-1 decimal) → ×100 fallback.
  const bayseFearPct: number = (() => {
    const cs = bayse.data?.stress?.crowd_stress;
    if (cs != null && Number.isFinite(cs)) return Math.round(cs);
    const cy = intel?.crowd_yes;
    if (cy != null && Number.isFinite(cy)) return Math.round(cy * 100);
    return 0;
  })();

  // Crowd fear and its rational complement — both 0-100
  const crowdStatPct = bayseFearPct;
  const modelStatPct = Math.max(0, 100 - bayseFearPct);

  const marketTitle =
    intel?.bayse_market ??
    bayse.data?.stress?.market_title ??
    "Bayse Market";

  const verdictLabel = intel?.verdict ?? intel?.decision_verdict ?? "HOLD";

  const displayName = profile.data?.name
    ? profile.data.name.split(" ")[0]
    : "there";

  return (
    <>
      {globalError && !errorDismissed && (
        <ErrorBanner
          error={globalError}
          onRetry={retryAll}
          onDismiss={() => setErrorDismissed(true)}
          autoHideDuration={0}
        />
      )}

      <DashboardOverlay
        show={globalLoading && !intel}
        message="Loading your intelligence..."
      />

      <section className="space-y-6">
        <PageHeader
          title={`${greeting}, ${displayName}`}
          description="here's your financial intelligence for today"
        />

        <main className="pb-8 space-y-3">
          {/* Weekly verdict — primary daily action */}
          <WeeklyVerdictCard
            verdict={verdictLabel}
            invest_ngn={intel?.invest_ngn ?? 0}
            save_ngn={intel?.save_ngn ?? 0}
            hold_ngn={intel?.hold_ngn ?? 0}
            allocation_plain={intel?.allocation_plain ?? ""}
            loading={intelligence.loading && !intel}
          />

          {/* Ask ZELTA CTA */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">
              Confused? Ask ZELTA anything.
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Use Co-pilot for simple next steps if you are unsure what to do today.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/dashboard/co-pilot"
                className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                Open Co-pilot
              </Link>
              <span className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
                Try: &quot;Should I save or invest this week?&quot;
              </span>
            </div>
          </div>

          {/* Market fear — uses crowd_stress from /api/bayse/stress (correct 0-100) */}
          <MarketAlert
            crowd_yes_pct={bayseFearPct}
            bayse_market={marketTitle}
            loading={globalLoading && !intel}
            error={null}
          />

          {/* Stress index — sourced exclusively from /api/intelligence (correct values) */}
          <StressIndexCard
            stress_index={stressIndex}
            stress_level={stressLevel}
            stress_label={stressLabel}
            bayse_primary_pct={crowdStatPct}
            market_probability_pct={modelStatPct}
            loading={globalLoading && !intel}
            error={null}
          />

          {/* Advanced details — collapsed by default */}
          <details className="rounded-xl border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              See details
            </summary>
            <div className="mt-3 space-y-3">
              <BiasAlertCard
                active_bias={intel?.active_bias}
                bias_explanation={intel?.bias_explanation}
                loading={intelligence.loading && !intel}
                error={null}
              />
              <DecisionScoreCard
                confidence_gap={intel?.confidence_gap}
                bias_confidence={intel?.bias_confidence}
                rational_pct={intel?.rational_pct}
                behavioral_pct={intel?.behavioral_pct}
                loading={intelligence.loading && !intel}
                error={null}
              />
            </div>
          </details>
        </main>
      </section>
    </>
  );
}

export default Dashboard;