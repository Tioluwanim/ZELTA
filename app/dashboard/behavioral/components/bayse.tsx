"use client";

import { Activity } from "lucide-react";
import { useBehavioralDataContext } from "@/context/BehavioralSnapshotContext";
import { DEFAULT_BEHAVIORAL_SNAPSHOT } from "@/hooks/zelta";
import { LoadingState } from "@/components/ui/State";

export default function Bayse() {
  const { snapshot, loading } = useBehavioralDataContext();
  const data = snapshot ?? DEFAULT_BEHAVIORAL_SNAPSHOT;

  if (loading) return <LoadingState text="Loading Bayse snapshot..." />;

  // FIX: bayse_crowd_fear and bayse_zelta_model are ALREADY 0-100 floats from
  // behavioral_service.py:  bayse_crowd_fear = round(market_prob * 100, 1)
  // The previous code multiplied by 100 again → 3770%. No conversion needed.
  const crowdFear  = Math.min(100, Math.max(0, Number(data.bayse_crowd_fear  ?? 0)));
  const zeltaModel = Math.min(100, Math.max(0, Number(data.bayse_zelta_model ?? 0)));

  // bayse_gap is ALREADY 0-100 float: round(abs(market_prob - rational_prob)*100, 1)
  const gap = Math.min(100, Math.max(0, Math.abs(Number(data.bayse_gap ?? 0))));

  const comparison =
    crowdFear > zeltaModel ? "more fearful than"
    : crowdFear < zeltaModel ? "less fearful than"
    : "exactly aligned with";

  const fearColor   = crowdFear  >= 60 ? "text-red-500"    : crowdFear  >= 30 ? "text-orange-400" : "text-emerald-500";
  const modelColor  = zeltaModel >= 60 ? "text-red-500"    : zeltaModel >= 30 ? "text-orange-400" : "text-emerald-500";

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
              <p className={`text-3xl font-bold ${fearColor}`}>{crowdFear.toFixed(1)}%</p>
              {/* Bar */}
              <div className="mt-2 h-2 w-40 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-2 rounded-full bg-orange-400" style={{ width: `${crowdFear}%` }} />
              </div>
            </div>

            <div>
              <p className="text-sm font-light text-gray-500">Calm Signal (ZELTA)</p>
              <p className={`text-3xl font-bold ${modelColor}`}>{zeltaModel.toFixed(1)}%</p>
              {/* Bar */}
              <div className="mt-2 h-2 w-40 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${zeltaModel}%` }} />
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            The crowd is{" "}
            <span className="font-semibold text-gray-700">{gap.toFixed(1)}%</span>{" "}
            {comparison} what the data supports. Use this to avoid panic-based decisions.
          </p>
        </div>
      </div>
    </section>
  );
}