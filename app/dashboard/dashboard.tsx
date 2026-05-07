"use client";
import { useState } from "react";
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
  const { intelligence, globalError, globalLoading, retryAll, profile, stress, bayse } =
    useZelta();
  const [errorDismissed, setErrorDismissed] = useState(false);

  const intel = intelligence.data;

  // ── Stress values ────────────────────────────────────────────────
  // /api/stress StressData now uses stress_index (not combined_index)
  const stressIndex = stress.data?.stress_index ?? intel?.stress_index;
  const stressLevel = stress.data?.level ?? intel?.stress_level;
  const stressLabel = stress.data?.label ?? intel?.stress_label;

  // ── Bayse Fear % ─────────────────────────────────────────────────
  // /api/bayse/stress returns crowd_stress (0-100) — NOT raw_crowd_stress
  // /api/intelligence returns crowd_yes which is crowd_yes_price (0-1 decimal)
  const bayseFearPct: number = (() => {
    const cs = bayse.data?.stress?.crowd_stress;
    if (cs != null && Number.isFinite(cs)) return Math.round(cs); // already 0-100
    const cy = intel?.crowd_yes;
    if (cy != null && Number.isFinite(cy)) return Math.round(cy * 100); // 0-1 → %
    return 0;
  })();

  // ── Bayse Primary % ─────────────────────────────────────────────
  // bayse_primary from /api/stress (or /api/intelligence) is a 0-1 decimal
  const baysePrimaryPct: number = (() => {
    const bp = stress.data?.bayse_primary ?? intel?.bayse_primary;
    return bp != null && Number.isFinite(bp) ? Math.round(bp * 100) : 0;
  })();

  // ── Market Probability % ────────────────────────────────────────
  // market_probability from /api/stress (or /api/intelligence) is a 0-1 decimal
  const marketProbPct: number = (() => {
    const mp = stress.data?.market_probability ?? intel?.market_probability;
    return mp != null && Number.isFinite(mp) ? Math.round(mp * 100) : 0;
  })();

  // ── Market title ────────────────────────────────────────────────
  const marketTitle =
    intel?.bayse_market ??
    bayse.data?.stress?.market_title ??
    "Bayse Market";

  // ── Verdict (allocation.verdict is primary — drives card heading) ─
  const verdictLabel = intel?.verdict ?? intel?.decision_verdict ?? "HOLD";

  const displayName = profile.data?.name || "there";

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
          {/* Bayse Market fear signal — crowd_stress is already 0-100 */}
          <MarketAlert
            crowd_yes_pct={bayseFearPct}
            bayse_market={marketTitle}
            loading={globalLoading && !intel}
            error={null}
          />

          {/* Stress index card */}
          <StressIndexCard
            stress_index={stressIndex}
            stress_level={stressLevel}
            stress_label={stressLabel}
            bayse_primary_pct={baysePrimaryPct}
            market_probability_pct={marketProbPct}
            loading={globalLoading && !intel}
            error={null}
          />

          {/* Active cognitive bias */}
          <BiasAlertCard
            active_bias={intel?.active_bias}
            bias_explanation={intel?.bias_explanation}
            loading={intelligence.loading && !intel}
            error={null}
          />

          {/* Rational vs behavioural confidence — all values already 0-100 integers */}
          <DecisionScoreCard
            confidence_gap={intel?.confidence_gap}
            bias_confidence={intel?.bias_confidence}
            rational_pct={intel?.rational_pct}
            behavioral_pct={intel?.behavioral_pct}
            loading={intelligence.loading && !intel}
            error={null}
          />

          {/* Weekly allocation verdict */}
          <WeeklyVerdictCard
            verdict={verdictLabel}
            invest_ngn={intel?.invest_ngn ?? 0}
            save_ngn={intel?.save_ngn ?? 0}
            hold_ngn={intel?.hold_ngn ?? 0}
            allocation_plain={intel?.allocation_plain ?? ""}
            loading={intelligence.loading && !intel}
          />
        </main>
      </section>
    </>
  );
}

export default Dashboard;