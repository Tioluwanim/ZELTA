"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Activity, Sparkles, MessageSquare, PiggyBank, Target } from "lucide-react";
import { useWallet, useBayseSignals, useSideHustleSimulation, useSavingsSimulation } from "@/hooks/zelta";
import { useZelta } from "@/context/zeltaContext";
import SimulationResults from "./components/SimulationResults";
import type { SideHustleSimRequest, SavingsSimRequest } from "@/types/zelta";

function SimulationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"side-hustle" | "savings">("side-hustle");

  const [sideHustleForm, setSideHustleForm] = useState<SideHustleSimRequest>({
    investment_amount: 0,
    hustle_type: "catering",
    expected_revenue_min: 0,
    expected_revenue_max: 0,
    time_horizon_weeks: 4,
    fixed_costs: 0,
  });

  const [savingsForm, setSavingsForm] = useState<SavingsSimRequest>({
    weekly_savings_amount: 0,
    target_amount: 0,
    upcoming_obligations: [],
  });
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { data: walletData, loading: walletLoading } = useWallet();
  const { intelligence } = useZelta();
  const stressData = intelligence.data;
  const { data: bayseData } = useBayseSignals();
  const sideHustleSim = useSideHustleSimulation();
  const savingsSim = useSavingsSimulation();

  const freeCash = walletData?.free_cash ?? 0;

  // /api/stress now returns stress_index (not combined_index) per updated StressData type
  // Use intelligence.data (full brain pipeline) — NOT /api/stress which returns wrong bayse score
  const stressIndex = stressData?.stress_index ?? 0;

  // /api/bayse/stress returns crowd_stress (0-100) — NOT raw_crowd_stress
  const rawCrowdStress = bayseData?.stress?.crowd_stress;
  const bayseFear  = Number.isFinite(rawCrowdStress) ? Math.round(rawCrowdStress!) : 0;
  const zeltaModel = Number.isFinite(rawCrowdStress) ? Math.round(100 - rawCrowdStress!) : 0;

  const handleSideHustleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sideHustleForm.expected_revenue_max < sideHustleForm.expected_revenue_min) {
      setInlineError("Max expected revenue should be greater than min expected revenue.");
      return;
    }
    if (sideHustleForm.investment_amount > freeCash) {
      setInlineError("Investment amount cannot be more than your available free cash.");
      return;
    }
    setInlineError(null);
    if (sideHustleForm.investment_amount > 0) {
      await sideHustleSim.runSimulation(sideHustleForm);
    }
  };

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingsForm.weekly_savings_amount > 0 && savingsForm.target_amount > 0) {
      await savingsSim.runSimulation(savingsForm);
    }
  };

  return (
    <div className="px-3 lg:px-0">
      <PageHeader
        title="Simulation"
        description="Try your idea first, then decide with confidence"
      />

      {/* Current Financial State */}
      <div className="bg-white border-2 border-gray-100 mt-3 w-full rounded-2xl p-4">
        <h2 className="text-gray-800 font-bold text-sm md:text-base">
          Current Financial State
        </h2>
        <section className="grid grid-cols-2 gap-3 mt-4 lg:flex lg:gap-2">
          {[
            {
              title: "Free Cash",
              value: walletLoading ? "Loading..." : `₦${freeCash.toLocaleString()}`,
              color: "text-gray-800",
            },
            {
              title: "Market Panic Level",
              value: `${Math.round(stressIndex)}/100`,
              color:
                stressIndex > 60
                  ? "text-red-500"
                  : stressIndex > 30
                  ? "text-yellow-500"
                  : "text-emerald-500",
            },
            {
              title: "Market Fear Level (Bayse)",
              // crowd_stress is already 0-100; guard against NaN
              value: bayseData ? `${bayseFear}%` : "—",
              color: "text-orange-400",
            },
            {
              title: "Calm Signal (ZELTA)",
              // Rational side: 100 - crowd_stress
              value: bayseData ? `${zeltaModel}%` : "—",
              color: "text-emerald-500",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="border-2 border-gray-100 bg-white rounded-2xl p-3 flex flex-col justify-center lg:w-[40%]"
            >
              <h3 className="text-gray-500 text-xs md:text-sm">{item.title}</h3>
              <p className={`font-bold text-lg md:text-xl ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </section>
      </div>

      {/* Simulator Tabs */}
      <div className="mt-6 bg-white border-2 border-gray-100 rounded-2xl p-4 lg:p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("side-hustle")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all ${
              activeTab === "side-hustle"
                ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Side Hustle
          </button>
          <button
            onClick={() => setActiveTab("savings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all ${
              activeTab === "savings"
                ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            Savings
          </button>
        </div>

        {/* ── Side Hustle Form ────────────────────────────────────── */}
        {activeTab === "side-hustle" && (
          <form onSubmit={handleSideHustleSubmit}>
            <div className="flex gap-3 items-start mb-4">
              <div className="bg-green-100 rounded-full w-10 h-10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-gray-800 font-bold text-lg md:text-xl">
                  Side Hustle Simulator
                </h1>
                <p className="text-gray-500 text-sm">
                  Test your business idea before spending real money
                </p>
              </div>
            </div>
            <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
              <p className="font-semibold">Beginner presets</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: "Freelancing", data: { hustle_type: "freelancing", investment_amount: 15000, expected_revenue_min: 25000, expected_revenue_max: 50000, time_horizon_weeks: 4, fixed_costs: 3000 } },
                  { label: "POS business", data: { hustle_type: "other", investment_amount: 80000, expected_revenue_min: 15000, expected_revenue_max: 45000, time_horizon_weeks: 8, fixed_costs: 12000 } },
                  { label: "Food sales", data: { hustle_type: "catering", investment_amount: 25000, expected_revenue_min: 40000, expected_revenue_max: 80000, time_horizon_weeks: 4, fixed_costs: 7000 } },
                  { label: "Campus printing", data: { hustle_type: "other", investment_amount: 50000, expected_revenue_min: 30000, expected_revenue_max: 70000, time_horizon_weeks: 6, fixed_costs: 10000 } },
                  { label: "Thrift business", data: { hustle_type: "reselling", investment_amount: 35000, expected_revenue_min: 55000, expected_revenue_max: 100000, time_horizon_weeks: 6, fixed_costs: 8000 } },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSideHustleForm((prev) => ({ ...prev, ...preset.data }))}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                Investment Amount (₦)
              </label>
              <input
                type="number"
                value={sideHustleForm.investment_amount || ""}
                onChange={(e) =>
                  setSideHustleForm((p) => ({
                    ...p,
                    investment_amount: Number(e.target.value),
                  }))
                }
                placeholder="Enter amount to invest"
                className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2"
                min="1"
                max={freeCash}
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                Available free cash: ₦{freeCash.toLocaleString()}
              </p>
              <p className="text-gray-400 text-[11px] mt-1">
                This is the money you can safely use now.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                Business Type
              </label>
              <select
                value={sideHustleForm.hustle_type}
                onChange={(e) =>
                  setSideHustleForm((p) => ({ ...p, hustle_type: e.target.value }))
                }
                className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2"
              >
                <option value="catering">Catering</option>
                <option value="reselling">Reselling</option>
                <option value="freelancing">Freelancing</option>
                <option value="content_creation">Content Creation</option>
                <option value="tutoring">Tutoring</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Min Expected Revenue (₦)
                </label>
                <input
                  type="number"
                  value={sideHustleForm.expected_revenue_min || ""}
                  onChange={(e) =>
                    setSideHustleForm((p) => ({
                      ...p,
                      expected_revenue_min: Number(e.target.value),
                    }))
                  }
                  placeholder="Minimum expected"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Max Expected Revenue (₦)
                </label>
                <input
                  type="number"
                  value={sideHustleForm.expected_revenue_max || ""}
                  onChange={(e) =>
                    setSideHustleForm((p) => ({
                      ...p,
                      expected_revenue_max: Number(e.target.value),
                    }))
                  }
                  placeholder="Maximum expected"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Time Horizon (Weeks)
                </label>
                <input
                  type="number"
                  value={sideHustleForm.time_horizon_weeks}
                  onChange={(e) =>
                    setSideHustleForm((p) => ({
                      ...p,
                      time_horizon_weeks: Number(e.target.value),
                    }))
                  }
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2"
                  min="1"
                  max="52"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Fixed Costs (₦)
                </label>
                <input
                  type="number"
                  value={sideHustleForm.fixed_costs || ""}
                  onChange={(e) =>
                    setSideHustleForm((p) => ({
                      ...p,
                      fixed_costs: Number(e.target.value),
                    }))
                  }
                  placeholder="Optional"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2"
                  min="0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sideHustleSim.loading}
              aria-label="Run side hustle simulation"
              className="w-full cursor-pointer hover:bg-emerald-400 h-12 bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {sideHustleSim.loading ? "Running Simulation..." : "Run Side Hustle Simulation"}
            </button>
            {inlineError && (
              <p className="mt-2 text-xs text-red-500">{inlineError}</p>
            )}
          </form>
        )}

        {/* ── Savings Form ───────────────────────────────────────── */}
        {activeTab === "savings" && (
          <form onSubmit={handleSavingsSubmit}>
            <div className="flex gap-3 items-start mb-4">
              <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-gray-800 font-bold text-lg md:text-xl">
                  Savings Simulator
                </h1>
                <p className="text-gray-500 text-sm">
                  Check if your weekly saving plan can meet your target
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Weekly Savings Amount (₦)
                </label>
                <input
                  type="number"
                  value={savingsForm.weekly_savings_amount || ""}
                  onChange={(e) =>
                    setSavingsForm((p) => ({
                      ...p,
                      weekly_savings_amount: Number(e.target.value),
                    }))
                  }
                  placeholder="How much per week?"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-blue-500 focus:border-2"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Target Amount (₦)
                </label>
                <input
                  type="number"
                  value={savingsForm.target_amount || ""}
                  onChange={(e) =>
                    setSavingsForm((p) => ({
                      ...p,
                      target_amount: Number(e.target.value),
                    }))
                  }
                  placeholder="Savings goal"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-blue-500 focus:border-2"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                Upcoming Obligations
              </label>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">
                  Fee obligations are loaded from your profile automatically.
                  The simulation shows risk levels (green / amber / red) per week.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingsSim.loading}
              aria-label="Run savings simulation"
              className="w-full cursor-pointer hover:bg-blue-400 h-12 bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Target className="w-5 h-5" />
              {savingsSim.loading ? "Running Projection..." : "Run Savings Projection"}
            </button>
          </form>
        )}
      </div>

      {/* Results */}
      {sideHustleSim.data?.success && (
        <SimulationResults result={sideHustleSim.data} />
      )}
      {savingsSim.data?.success && (
        <SimulationResults result={savingsSim.data} />
      )}

      {/* Errors */}
      {(sideHustleSim.error || savingsSim.error) && (
        <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            <h3 className="text-red-700 font-bold">Simulation Error</h3>
          </div>
          <p className="text-red-600 mt-2 text-sm">
            {sideHustleSim.error || savingsSim.error}
          </p>
        </div>
      )}

      {/* How it works */}
      <div className="border-2 border-gray-100 w-full mt-6 bg-white rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-800">What do these numbers mean?</h2>
        </div>
        <p className="text-gray-500 mt-2 text-xs md:text-sm leading-relaxed">
          We run 1,000 possible outcomes using your inputs. "Safe Allocation" is a safer
          amount to commit right now. "Decision Score" shows quality of the plan. "Outcome
          bands" show worst-case, expected, and best-case ranges so you can plan with less risk.
        </p>
      </div>

      <button
        onClick={() => router.push("/dashboard/co-pilot")}
        className="fixed bottom-24 right-5 bg-emerald-500 rounded-full w-12 h-12 z-50 flex items-center justify-center shadow-lg hover:bg-emerald-400 transition-all lg:hidden"
        title="Confused? Ask ZELTA anything."
      >
        <MessageSquare className="text-white w-5 h-5" />
      </button>
    </div>
  );
}

export default SimulationsPage;