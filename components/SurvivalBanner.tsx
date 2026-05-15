"use client";

import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export interface SurvivalBannerProps {
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
}: SurvivalBannerProps) {
  if (!agent_mode || agent_mode === "NORMAL") return null;

  const isEmergency = agent_mode === "EMERGENCY";

  return (
    <div
      className={`space-y-3 rounded-2xl border p-4 ${
        isEmergency ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isEmergency ? (
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
        )}

        <div>
          <p
            className={`text-sm font-bold ${
              isEmergency ? "text-red-700" : "text-amber-700"
            }`}
          >
            {isEmergency
              ? "⚠️ Emergency — Low Cash"
              : "⚠️ Survival Mode — Protect Your Money"}
          </p>

          <p
            className={`text-xs ${
              isEmergency ? "text-red-600" : "text-amber-600"
            }`}
          >
            {status_message ??
              (isEmergency
                ? `Money runs out in ${weeks_of_runway?.toFixed(
                    1
                  )} weeks at current pace`
                : `Fee shortfall: ₦${(fee_gap_ngn ?? 0).toLocaleString()}. Save before you spend.`)}
          </p>
        </div>
      </div>

      {safe_discretionary_ngn != null && (
        <div className="flex items-center justify-between rounded-xl border border-white bg-white/60 px-3 py-2">
          <p className="text-xs font-medium text-gray-600">
            Max safe spend this week
          </p>
          <p
            className={`text-sm font-bold ${
              isEmergency ? "text-red-600" : "text-amber-700"
            }`}
          >
            ₦{safe_discretionary_ngn.toLocaleString()}
          </p>
        </div>
      )}

      {purchase_safety_check && (
        <div className="rounded-xl border border-white bg-white/70 px-3 py-2.5">
          <p className="mb-1 text-xs font-semibold text-gray-700">
            ZELTA Purchase Check
          </p>
          <p className="text-xs leading-relaxed text-gray-600">
            {purchase_safety_check}
          </p>
        </div>
      )}

      {hustle_recommendations && (
        <details className="rounded-xl border border-white bg-white/70">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-gray-700">
            💡 Campus hustles to earn extra cash
          </summary>
          <div className="px-3 pb-3 pt-1">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">
              {hustle_recommendations}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}