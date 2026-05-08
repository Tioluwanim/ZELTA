"use client";

import React from "react";
import { Landmark, Users, Clock, TrendingDown, CheckCircle } from "lucide-react";
import { useBehavioralDataContext } from "@/context/BehavioralSnapshotContext";
import { DEFAULT_BEHAVIORAL_SNAPSHOT } from "@/hooks/zelta";
import { LoadingState } from "@/components/ui/State";

export default function Five() {
  const { snapshot, loading } = useBehavioralDataContext();
  const data = snapshot ?? DEFAULT_BEHAVIORAL_SNAPSHOT;

  if (loading) return <LoadingState text="Loading tracked biases..." />;

  const biases = Array.isArray(data.tracked_biases) ? data.tracked_biases : [];

  const getIcon = (bias: string) => {
    switch (bias?.toLowerCase()) {
      case "loss aversion":   return TrendingDown;
      case "present bias":    return Clock;
      case "overconfidence":  return CheckCircle;
      case "herd behavior":   return Users;
      case "mental accounting": return Landmark;
      default:                return TrendingDown;
    }
  };

  const getStrengthLabel = (value: number) =>
    value >= 60 ? "HIGH" : value >= 30 ? "MODERATE" : "LOW";

  const getStrengthColor = (value: number, isActive: boolean) =>
    !isActive         ? "text-gray-500"
    : value >= 60     ? "text-red-500"
    : value >= 30     ? "text-orange-400"
    : "text-emerald-500";

  const getBarColor = (value: number, isActive: boolean) =>
    !isActive         ? "bg-gray-300"
    : value >= 60     ? "bg-red-400"
    : value >= 30     ? "bg-orange-400"
    : "bg-emerald-500";

  const visibleBiases = biases.slice(0, 5);

  return (
    <div className="p-2 lg:p-0">
      <h2 className="mt-5 ml-4 text-2xl font-bold text-gray-800">
        Behavioral Biases Tracked
      </h2>

      {visibleBiases.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-5 lg:ml-5">
          <p className="text-sm text-gray-500">
            No tracked biases yet. ZELTA will populate this section as more
            behavioral data arrives.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-5 lg:ml-5">
          {visibleBiases.map((bias, index) => {
            const Icon = getIcon(bias.bias);
            const isActive = bias.status?.toLowerCase() === "active";

            // FIX: current_strength is ALREADY 0-100 from behavioral_service.py:
            //   current_strength = round((count / total) * 100, 1)
            // Previous code: Math.round(Number(bias.current_strength ?? 0) * 100)
            // → e.g. 0.0 * 100 = 0% (accidentally shows correctly when 0 but wrong formula)
            // → e.g. 45.0 * 100 = 4500% → clamped to 100% and shows wrong value
            const strength = Math.min(
              100,
              Math.max(0, Math.round(Number(bias.current_strength ?? 0)))
            );

            return (
              <div
                key={index}
                className={`w-full rounded-2xl border p-5 ${
                  isActive
                    ? "border-orange-400/30 bg-orange-200/20"
                    : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isActive ? "bg-orange-100" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isActive ? "text-orange-400" : "text-gray-400"
                      }`}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">
                        {bias.bias || "Unknown Bias"}
                      </h3>
                      {isActive && (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-400">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {bias.explanation || "No explanation available"}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-gray-500">Current Strength</p>
                      <p className={`text-sm font-bold ${getStrengthColor(strength, isActive)}`}>
                        {strength}% {getStrengthLabel(strength)}
                      </p>
                    </div>

                    <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${getBarColor(strength, isActive)}`}
                        style={{ width: `${Math.max(strength, 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}