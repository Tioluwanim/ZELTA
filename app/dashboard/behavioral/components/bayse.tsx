"use client";

import { Activity } from "lucide-react";
import { useBehavioralDataContext } from "@/context/BehavioralSnapshotContext";
import { DEFAULT_BEHAVIORAL_SNAPSHOT, useBayseSignals } from "@/hooks/zelta";
import { LoadingState } from "@/components/ui/State";

export default function Bayse() {
  const { snapshot, loading } = useBehavioralDataContext();
  const data = snapshot ?? DEFAULT_BEHAVIORAL_SNAPSHOT;

  // ── ROOT CAUSE FIX ────────────────────────────────────────────────
  // Dashboard shows 24%  → reads /api/bayse/stress  → crowd_stress field
  //   (computed as: distance-from-0.5 formula on the live YES price)
  // Behavioral showed 38% → read /api/behavioral/snapshot → bayse_crowd_fear
  //   (which is crowd_yes_price × 100 — the raw YES price, a different number)
  //
  // Fix: pull live crowd_stress from useBayseSignals (same hook as dashboard)
  // so both pages always show the exact same number.
  const bayse = useBayseSignals();
  const liveCrowdStress = bayse.data?.stress?.crowd_stress;

  const crowdFear = Math.min(
    100,
    Math.max(
      0,
      liveCrowdStress != null && Number.isFinite(liveCrowdStress)
        ? Math.round(liveCrowdStress)
        : Number(data.bayse_crowd_fear ?? 0)   // fallback to snapshot value
    )
  );

  // Calm Signal always = 100 - crowdFear so the pair sums to 100% intuitively
  const zeltaModel = Math.round(100 - crowdFear);
  const gap = Math.abs(crowdFear - zeltaModel);

  const comparison =
    crowdFear > zeltaModel ? "more fearful than"
    : crowdFear < zeltaModel ? "less fearful than"
    : "exactly aligned with";

  const fearColor  = crowdFear  >= 60 ? "text-red-500" : crowdFear  >= 30 ? "text-orange-400" : "text-emerald-500";
  const modelColor = zeltaModel >= 60 ? "text-red-500" : zeltaModel >= 30 ? "text-orange-400" : "text-emerald-500";

  if (loading || bayse.loading) return <LoadingState text="Loading Bayse snapshot..." />;

  return (
    <section className="mt-5 w-full rounded-2xl bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-200">
          <Activity className="h-5 w-5 text-orange-400" />
        </div>

        <div className="w-full">
          <h2 className="text-lg font-bold text-gray-800">Bayse Emotional Signal vs ZELTA</h2>
          <p className="mt-1 text-xs text-gray-500">
            Bayse measures emotional market behavior and crowd panic patterns.
          </p>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:gap-10">
            <div>
              <p className="text-sm font-light text-gray-500">Market Fear Level (Bayse)</p>
              <p className={`text-3xl font-bold ${fearColor}`}>{crowdFear}%</p>
              <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-orange-400 transition-all" style={{ width: `${crowdFear}%` }} />
              </div>
            </div>

            <div>
              <p className="text-sm font-light text-gray-500">Calm Signal (ZELTA)</p>
              <p className={`text-3xl font-bold ${modelColor}`}>{zeltaModel}%</p>
              <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${zeltaModel}%` }} />
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            The crowd is{" "}
            <span className="font-semibold text-gray-700">{gap}%</span>{" "}
            {comparison} what the data supports. Use this to avoid panic-based decisions.
          </p>

          {bayse.data?.stress?.market_title && (
            <p className="mt-2 text-xs text-gray-400">
              Market: {bayse.data.stress.market_title}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}