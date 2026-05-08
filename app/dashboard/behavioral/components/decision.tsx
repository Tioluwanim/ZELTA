"use client";

import { Brain } from "lucide-react";
import { useBehavioralDataContext } from "@/context/BehavioralSnapshotContext";
import { DEFAULT_BEHAVIORAL_SNAPSHOT } from "@/hooks/zelta";
import { LoadingState } from "@/components/ui/State";

export default function Decision() {
  const { snapshot, loading } = useBehavioralDataContext();
  const data = snapshot ?? DEFAULT_BEHAVIORAL_SNAPSHOT;

  if (loading) return <LoadingState text="Loading decision snapshot..." />;

  // FIX: rational_pct, behavioral_pct, decision_gap are ALREADY 0-100 floats
  // from behavioral_service.py (copied directly from confidence_data which is 0-100).
  // The previous code multiplied by 100 again → 3900%, 2200%. Remove all *100.
  const safe = (v: unknown) =>
    Math.min(100, Math.max(0, Math.round(Number(v ?? 0))));

  const rationalPct    = safe(data.rational_pct);
  const behavioralPct  = safe(data.behavioral_pct);
  const confidenceGap  = safe(data.decision_gap);

  const gapSeverity =
    confidenceGap >= 40 ? { bg: "border-red-400/30 bg-red-200/20",    text: "text-red-600",    label: "HIGH" }
    : confidenceGap >= 20 ? { bg: "border-orange-400/30 bg-orange-200/20", text: "text-orange-600", label: "MODERATE" }
    : { bg: "border-green-400/30 bg-green-200/20",   text: "text-green-700",  label: "LOW" };

  return (
    <section className="mt-3 w-full rounded-2xl border border-gray-100 bg-white pb-6">
      <div className="flex gap-3 p-5">
        <div className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <Brain className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Decision Confidence Score</h2>
          <p className="text-sm text-gray-500">Current rational vs behavioral split</p>
        </div>
      </div>

      {/* Cards */}
      <section className="mt-2 flex flex-col gap-5 px-4 lg:flex-row lg:justify-center">
        {/* Rational */}
        <div className="w-full rounded-2xl bg-green-50 p-5 lg:max-w-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Rational</h3>
            <p className="text-4xl font-bold text-green-600">{rationalPct}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-green-100">
            <div
              className="h-3 rounded-full bg-[#10b981] transition-all duration-700"
              style={{ width: `${rationalPct}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Decisions based on Bayesian model and Kelly sizing.
          </p>
        </div>

        {/* Behavioral */}
        <div className="w-full rounded-2xl bg-orange-50 p-5 lg:max-w-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Behavioral Impulse</h3>
            <p className="text-4xl font-bold text-orange-600">{behavioralPct}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-orange-100">
            <div
              className="h-3 rounded-full bg-orange-400 transition-all duration-700"
              style={{ width: `${behavioralPct}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Driven by stress, fear, and market panic.
          </p>
        </div>
      </section>

      {/* Gap */}
      <div className={`mx-4 mt-6 rounded-2xl border p-5 ${gapSeverity.bg}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-orange-300 text-orange-300">
            <span className="text-xs font-bold">!</span>
          </div>
          <h4 className="font-bold text-gray-800">
            Confidence Gap: {confidenceGap}%
            <span className={`ml-2 text-sm font-semibold ${gapSeverity.text}`}>
              — {gapSeverity.label}
            </span>
          </h4>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          | rational recommendation − behavioral impulse | ={" "}
          <span className="font-bold text-gray-800">{confidenceGap}%</span>.{" "}
          {confidenceGap >= 40
            ? "ZELTA intervention is strongly recommended."
            : confidenceGap >= 20
            ? "ZELTA adds the most value here."
            : "Your decisions are well-calibrated."}
        </p>
      </div>
    </section>
  );
}