"use client";

import React from "react";
import { AlertTriangle, ShieldAlert, CheckCircle } from "lucide-react";

interface Props {
  agent_mode?: "EMERGENCY" | "SURVIVAL" | "NORMAL" | string;
  weeks_of_runway?: number;
  fee_gap_ngn?: number;
  status_message?: string;
  safe_discretionary_ngn?: number;
  hustle_recommendations?: string | null;
  purchase_safety_check?: string | null;
}

export default function SurvivalBanner({
  agent_mode,
  weeks_of_runway,
  fee_gap_ngn,
  status_message,
  safe_discretionary_ngn,
  hustle_recommendations,
  purchase_safety_check,
}: Props) {
  if (!agent_mode || agent_mode === "NORMAL") return null;

  const isEmergency = agent_mode === "EMERGENCY";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${
      isEmergency
        ? "border-red-200 bg-red-50"
        : "border-amber-200 bg-amber-50"
    }`}>
      {/* Mode header */}
      <div className="flex items-center gap-2.5">
        {isEmergency
          ? <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
          : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />}
        <div>
          <p className={`text-sm font-bold ${isEmergency ? "text-red-700" : "text-amber-700"}`}>
            {isEmergency ? "⚠️ Emergency — Low Cash" : "⚠️ Survival Mode — Protect Your Money"}
          </p>
          <p className={`text-xs ${isEmergency ? "text-red-600" : "text-amber-600"}`}>
            {status_message ?? (isEmergency
              ? `Money runs out in ${weeks_of_runway?.toFixed(1)} weeks at current pace`
              : `Fee shortfall: ₦${(fee_gap_ngn ?? 0).toLocaleString()}. Save before you spend.`)}
          </p>
        </div>
      </div>

      {/* Safe spend */}
      {safe_discretionary_ngn != null && (
        <div className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 border border-white">
          <p className="text-xs font-medium text-gray-600">Max safe spend this week</p>
          <p className={`text-sm font-bold ${isEmergency ? "text-red-600" : "text-amber-700"}`}>
            ₦{safe_discretionary_ngn.toLocaleString()}
          </p>
        </div>
      )}

      {/* Purchase safety check from AI */}
      {purchase_safety_check && (
        <div className="rounded-xl bg-white/70 px-3 py-2.5 border border-white">
          <p className="text-xs font-semibold text-gray-700 mb-1">ZELTA Purchase Check</p>
          <p className="text-xs text-gray-600 leading-relaxed">{purchase_safety_check}</p>
        </div>
      )}

      {/* Hustle recommendations from AI */}
      {hustle_recommendations && (
        <details className="rounded-xl bg-white/70 border border-white">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-gray-700">
            💡 Campus hustles to earn extra cash
          </summary>
          <div className="px-3 pb-3 pt-1">
            <pre className="whitespace-pre-wrap text-xs text-gray-600 font-sans leading-relaxed">
              {hustle_recommendations}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}