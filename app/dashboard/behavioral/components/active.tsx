"use client";

import { MessageSquareQuote, CheckCircle } from "lucide-react";
import { useBehavioralDataContext } from "@/context/BehavioralSnapshotContext";
import { DEFAULT_BEHAVIORAL_SNAPSHOT } from "@/hooks/zelta";
import { LoadingState } from "@/components/ui/State";

const RATIONAL_VALUES = ["none", "rational", ""];

export default function Active() {
  const { snapshot, loading } = useBehavioralDataContext();
  const data = snapshot ?? DEFAULT_BEHAVIORAL_SNAPSHOT;

  if (loading) return <LoadingState text="Loading active bias..." />;

  const evidence = Array.isArray(data.evidence) ? data.evidence : [];
  const biasKey  = (data.active_bias ?? "").toLowerCase().trim();
  const isRational = RATIONAL_VALUES.includes(biasKey);

  // FIX: bias_strength_value is ALREADY 0-100 from behavioral_service.py:
  //   bias_strength_value = round(active_bias_strength, 1)
  //   where active_bias_strength = bias_scores[active_bias_key] (already 0-100)
  // Previous code: (data.bias_strength_value ?? 0) * 100 → e.g. 45 * 100 = 4500%. Remove *100.
  const strengthPct = Math.min(100, Math.max(0, Math.round(Number(data.bias_strength_value ?? 0))));
  const strengthLabel = data.bias_strength_label || (
    strengthPct >= 60 ? "HIGH" : strengthPct >= 30 ? "MODERATE" : "LOW"
  );

  const strengthBarColor =
    strengthPct >= 60 ? "bg-red-400"
    : strengthPct >= 30 ? "bg-orange-400"
    : "bg-emerald-500";

  return (
    <div className="p-2 lg:p-0">
      <section className="mt-5 rounded-2xl bg-white pb-6 shadow-sm lg:pb-0">
        {/* Header */}
        <div className="flex gap-3 px-4 pt-7 lg:px-7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-200">
            <MessageSquareQuote className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Active Bias Detected</h2>
            <p className="text-sm text-gray-500">Based on bias signals + wallet patterns</p>
          </div>
        </div>

        <div className="mx-auto mt-5 w-[94%] rounded-2xl bg-white pb-6 lg:mx-0 lg:ml-7 lg:pb-0">
          {/* Bias name */}
          {isRational ? (
            <div className="flex items-center gap-2 ml-5">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
              <h1 className="text-3xl font-bold text-emerald-500 lg:text-4xl">Rational</h1>
            </div>
          ) : (
            <h1 className="relative top-5 ml-5 text-3xl font-bold uppercase text-orange-400 lg:text-4xl">
              {data.active_bias}
            </h1>
          )}

          <p className={`ml-5 pr-4 text-sm text-gray-500 lg:pr-0 ${isRational ? "mt-3" : "mt-10 lg:mt-7"}`}>
            {data.explanation ||
              (isRational
                ? "Market appears stable. Your decisions are tracking the data well."
                : "A cognitive bias is influencing your decisions. Review before acting.")}
          </p>

          {/* Bias strength */}
          <div className="mt-6 flex justify-between px-5 lg:mt-3 lg:justify-start lg:gap-40 lg:px-0">
            <p className="text-gray-500">Bias Strength</p>
            <p className={`text-sm font-bold ${
              strengthPct >= 60 ? "text-red-500"
              : strengthPct >= 30 ? "text-orange-400"
              : "text-emerald-500"
            }`}>
              {strengthLabel}
            </p>
          </div>

          <div className="mx-auto mt-2 h-3 w-[90%] overflow-hidden rounded-full bg-gray-100 lg:ml-5 lg:w-[94%]">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${strengthBarColor}`}
              style={{ width: `${Math.max(strengthPct, 2)}%` }}
            />
          </div>

          {/* Evidence */}
          <div className="mx-auto mt-5 w-[92%] rounded-2xl border border-orange-400/30 bg-orange-200/20 pb-4 lg:ml-5 lg:mt-3 lg:w-[95%] lg:pb-0">
            <h2 className="ml-5 mt-5 text-sm font-bold text-gray-800">
              Evidence from Transactions
            </h2>
            <div className="mt-2 space-y-2 pb-4">
              {evidence.length > 0 ? (
                evidence.map((item, index) => (
                  <div key={index} className="ml-5 flex gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-orange-300 text-orange-300">
                      <span className="text-sm leading-none">×</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {item.plain_english || "No explanation available"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="ml-5 pb-2 text-sm text-gray-400 italic">
                  No evidence yet — ZELTA will populate this once transaction history builds up.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Correction */}
        <div className="mx-auto mt-5 w-[94%] rounded-2xl bg-white p-5 lg:mx-0 lg:ml-7 lg:p-0">
          <h1 className="font-bold text-gray-800 lg:relative lg:top-2 lg:ml-5">
            ZELTA Correction Applied:
          </h1>
          <p className="mt-3 text-sm text-gray-500 lg:ml-5 lg:pb-4">
            {data.correction_plain || "No correction available."}
          </p>
        </div>
      </section>
    </div>
  );
}