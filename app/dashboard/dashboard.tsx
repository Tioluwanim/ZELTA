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
const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

function Dashboard() {
  const { intelligence, globalError, globalLoading, retryAll, profile, stress, bayse } = useZelta();
  const [errorDismissed, setErrorDismissed] = useState(false);

  const {
    stress_index, stress_level, stress_label,
    active_bias, bias_explanation,
    confidence_gap, crowd_yes, bayse_market, market_probability,
    bias_confidence, rational_pct, behavioral_pct,
    invest_ngn, save_ngn, hold_ngn, allocation_plain,
  } = intelligence.data || {};

  const stressIndex = stress.data?.combined_index ?? stress_index;
  const stressLevel = stress.data?.level ?? stress_level;
  const stressLabel = stress.data?.label ?? stress_label;

  // FIX: raw_crowd_stress is already 0-100 from the backend stress monitor.
  // crowd_yes in IntelligenceData is a 0-1 decimal (crowd_yes_price from Bayse).
  // We normalise both to a plain 0-100 integer here so child components
  // never need to multiply/divide themselves.
  const bayseFearPct: number =
    bayse.data?.stress?.raw_crowd_stress != null
      ? Math.round(bayse.data.stress.raw_crowd_stress)         // already 0-100
      : crowd_yes != null
      ? Math.round(crowd_yes * 100)                            // 0-1 → 0-100
      : 0;

  // bayse_primary from /api/stress is a 0-1 decimal (the bayse stress component).
  const baysePrimaryPct: number =
    stress.data?.bayse_primary != null
      ? Math.round(stress.data.bayse_primary * 100)
      : intelligence.data?.bayse_primary != null
      ? Math.round(intelligence.data.bayse_primary * 100)
      : 0;

  // market_probability from /api/stress is a 0-1 decimal.
  const marketProbPct: number =
    stress.data?.market_probability != null
      ? Math.round(stress.data.market_probability * 100)
      : market_probability != null
      ? Math.round(market_probability * 100)
      : 0;

  const marketTitle = bayse_market ?? bayse.data?.stress?.market_title ?? "Bayse Market";

  // verdict drives the WeeklyVerdictCard heading (INVEST / SAVE / HOLD)
  const verdictLabel = intelligence.data?.verdict ?? intelligence.data?.decision_verdict ?? "HOLD";

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

      <DashboardOverlay show={globalLoading && !intelligence.data} message="Loading your dashboard..." />

      <section className="space-y-6">
        <PageHeader title={`${greeting}, ${displayName}`} description="here's your financial intelligence for today" />

        <main className="pb-8 space-y-3">
          <MarketAlert
            crowd_yes_pct={bayseFearPct}
            bayse_market={marketTitle}
            loading={globalLoading}
            error={null}
          />

          <StressIndexCard
            stress_index={stressIndex}
            stress_level={stressLevel}
            stress_label={stressLabel}
            bayse_primary_pct={baysePrimaryPct}
            market_probability_pct={marketProbPct}
            loading={globalLoading}
            error={null}
          />

          <BiasAlertCard
            active_bias={active_bias}
            bias_explanation={bias_explanation}
            loading={intelligence.loading}
            error={null}
          />

          <DecisionScoreCard
            confidence_gap={confidence_gap}
            bias_confidence={bias_confidence}
            rational_pct={rational_pct}
            behavioral_pct={behavioral_pct}
            loading={intelligence.loading}
            error={null}
          />

          <WeeklyVerdictCard
            verdict={verdictLabel}
            invest_ngn={invest_ngn ?? 0}
            save_ngn={save_ngn ?? 0}
            hold_ngn={hold_ngn ?? 0}
            allocation_plain={allocation_plain ?? ""}
            loading={intelligence.loading}
          />
        </main>
      </section>
    </>
  );
}

export default Dashboard;