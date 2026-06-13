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
import SurvivalBanner from "@/components/SurvivalBanner";
import { useZelta } from "@/context/zeltaContext";
import { useSapaHealth } from "@/hooks/zelta";
import { Wallet, Brain, TrendingUp, MessageSquare, ChevronDown, ChevronUp, Briefcase, Flame, Clock } from "lucide-react";
import Link2 from "next/link";

const hour = new Date().getHours();
const greeting =
  hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

function Dashboard() {
  const { intelligence, globalError, globalLoading, retryAll, profile, bayse } = useZelta();
  const sapa = useSapaHealth();
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const intel = intelligence.data;

  const stressIndex = intel?.stress_index;
  const stressLevel = intel?.stress_level;
  const stressLabel = intel?.stress_label;

  const bayseFearPct: number = (() => {
    const cs = bayse.data?.stress?.crowd_stress;
    if (cs != null && Number.isFinite(cs)) return Math.round(cs);
    const cy = intel?.crowd_yes;
    if (cy != null && Number.isFinite(cy)) return Math.round(cy * 100);
    return 0;
  })();

  const crowdStatPct = bayseFearPct;
  const modelStatPct = Math.max(0, 100 - bayseFearPct);
  const marketTitle = intel?.bayse_market ?? bayse.data?.stress?.market_title ?? "Bayse Market";
  const verdictLabel = intel?.student_verdict ?? intel?.verdict ?? intel?.decision_verdict ?? "HOLD";

  // student_model — survival intelligence from AI pipeline
  const studentModel = (intelligence.data as any)?.student_model as {
    agent_mode?: "EMERGENCY" | "SURVIVAL" | "NORMAL";
    survival_score?: number;
    weeks_of_runway?: number;
    fee_gap_ngn?: number;
    fee_amount_due?: number;
    status_message?: string;
    safe_discretionary_ngn?: number;
  } | undefined;

  const agentMode         = studentModel?.agent_mode;
  const survivalScore     = studentModel?.survival_score;
  const weeksOfRunway     = studentModel?.weeks_of_runway;
  const feeGapNgn         = studentModel?.fee_gap_ngn;
  const statusMessage     = studentModel?.status_message;
  const safeDiscretionary = studentModel?.safe_discretionary_ngn;

  // brain tool outputs
  const hustleRecs     = (intelligence.data as any)?.hustle_recommendations as string | undefined;
  const purchaseSafety = (intelligence.data as any)?.purchase_safety_check as string | undefined;

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

      <DashboardOverlay show={globalLoading && !intel} message="Loading your intelligence..." />

      <section className="space-y-4 pb-8">
        {/* ── Header ── */}
        <PageHeader
          title={`${greeting}, ${displayName}`}
          description="here's your financial intelligence for today"
        />

        {/* ── Sapa Health Bar ── */}
        {!sapa.loading && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sapa Health</p>
                <p className="text-2xl font-bold text-gray-900">{sapa.sapaScore}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Runway</p>
                <p className="text-lg font-bold text-gray-800">{sapa.runwayDays} days</p>
              </div>
            </div>
            {/* Health bar */}
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  sapa.sapaScore >= 60 ? "bg-emerald-500" :
                  sapa.sapaScore >= 30 ? "bg-amber-400" : "bg-red-500"
                }`}
                style={{ width: `${sapa.sapaScore}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>{sapa.streakDays > 0 ? `${sapa.streakDays}-day save streak 🔥` : "Start a save streak"}</span>
              </div>
              {sapa.daysToExam !== null && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-violet-600 font-medium">λt={sapa.lambdaT.toFixed(2)} · {sapa.daysToExam}d to exam</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Gig Board shortcut ── */}
        <Link href="/dashboard/gig-board" className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 transition hover:bg-emerald-100">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Campus Gig Board</p>
              <p className="text-xs text-emerald-600">Find side hustles to extend your runway</p>
            </div>
          </div>
          <ChevronUp className="h-4 w-4 rotate-90 text-emerald-400" />
        </Link>

        {/* ── Survival / Emergency Banner ── */}
        {(agentMode === "EMERGENCY" || agentMode === "SURVIVAL") && (
          <SurvivalBanner
            agent_mode={agentMode}
            weeks_of_runway={weeksOfRunway}
            fee_gap_ngn={feeGapNgn}
            status_message={statusMessage}
            safe_discretionary_ngn={safeDiscretionary}
            hustle_recommendations={hustleRecs}
            purchase_safety_check={purchaseSafety}
          />
        )}

        {/* ── Weekly verdict ── */}
        <WeeklyVerdictCard
          verdict={verdictLabel}
          student_verdict={intel?.student_verdict}
          invest_ngn={intel?.invest_ngn ?? 0}
          save_ngn={intel?.save_ngn ?? 0}
          hold_ngn={intel?.hold_ngn ?? 0}
          spend_safely_ngn={(intel as any)?.spend_safely_ngn}
          protect_ngn={(intel as any)?.protect_ngn}
          allocation_plain={intel?.allocation_plain ?? ""}
          agent_mode={agentMode}
          survival_score={survivalScore}
          weeks_of_runway={weeksOfRunway}
          fee_gap_ngn={feeGapNgn}
          status_message={statusMessage}
          safe_discretionary_ngn={safeDiscretionary}
          loading={intelligence.loading && !intel}
        />

        {/* ── Quick nav pills ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/dashboard/wallet",      icon: Wallet,    label: "My Money",  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { href: "/dashboard/behavioral",  icon: Brain,     label: "My Mindset",color: "bg-violet-50 text-violet-700 border-violet-200" },
            { href: "/dashboard/simulations", icon: TrendingUp,label: "What If?",  color: "bg-orange-50 text-orange-700 border-orange-200" },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition hover:scale-[1.02] ${color}`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>

        {/* ── Ask ZELTA CTA ── */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">Confused? Ask ZELTA anything.</p>
          </div>
          <p className="text-xs text-emerald-600/80 mb-3">
            Tap the green chat button below — or open the full co-pilot.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/co-pilot"
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition"
            >
              Open Co-pilot
            </Link>
            <span className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
              Try: &quot;Will my money last till month end?&quot;
            </span>
          </div>
        </div>

        {/* ── Market signal ── */}
        <MarketAlert
          crowd_yes_pct={bayseFearPct}
          bayse_market={marketTitle}
          loading={globalLoading && !intel}
          error={null}
        />

        {/* ── Market Panic Level ── */}
        <StressIndexCard
          stress_index={stressIndex}
          stress_level={stressLevel}
          stress_label={stressLabel}
          bayse_primary_pct={crowdStatPct}
          market_probability_pct={modelStatPct}
          loading={globalLoading && !intel}
          error={null}
        />

        {/* ── Bias + Decision — collapsible ── */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setDetailsOpen(v => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <span>Your Behavioral Details</span>
            {detailsOpen
              ? <ChevronUp className="h-4 w-4 text-gray-400" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {detailsOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
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
          )}
        </div>
      </section>
    </>
  );
}

export default Dashboard;