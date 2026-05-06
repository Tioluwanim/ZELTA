"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Activity, Sparkles, MessageSquare, PiggyBank, Target } from "lucide-react";
import { useWallet } from "@/hooks/zelta";
import { useStress } from "@/hooks/zelta";
import { useBayseSignals } from "@/hooks/zelta";
import { useSideHustleSimulation, useSavingsSimulation } from "@/hooks/zelta";
import SimulationResults from "./components/SimulationResults";
import type { SideHustleSimRequest, SavingsSimRequest } from "@/types/zelta";

function SimulationsPage() {
  const router = useRouter();
  // Form states
  const [activeTab, setActiveTab] = useState<"side-hustle" | "savings">("side-hustle");

  // Side hustle form
  const [sideHustleForm, setSideHustleForm] = useState<SideHustleSimRequest>({
    investment_amount: 0,
    hustle_type: "catering",
    expected_revenue_min: 0,
    expected_revenue_max: 0,
    time_horizon_weeks: 4,
    fixed_costs: 0,
  });

  // Savings form
  const [savingsForm, setSavingsForm] = useState<SavingsSimRequest>({
    weekly_savings_amount: 0,
    target_amount: 0,
    upcoming_obligations: [],
  });

  // API hooks
  const { data: walletData, loading: walletLoading } = useWallet();
  const { data: stressData } = useStress();
  const { data: bayseData } = useBayseSignals();
  const sideHustleSim = useSideHustleSimulation();
  const savingsSim = useSavingsSimulation();

  // Calculate derived values
  const freeCash = walletData?.free_cash || 0;
  const stressIndex = stressData?.combined_index || 0;
  const bayseFear = bayseData?.stress?.raw_crowd_stress || 0;
  const zeltaModel = bayseData?.stress ? 100 - bayseData.stress.raw_crowd_stress : 0;

  const handleSideHustleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      {/* HEADER */}
      <PageHeader
        title="Portfolio Simulations"
        description="Practice before you commit — Bayesian Monte Carlo projection"
      />

      {/* STATS */}
      <div className="bg-white border-2 border-gray-100 mt-3 w-full rounded-2xl p-4">
        <h2 className="text-gray-800 font-bold text-sm md:text-md">
          Current Financial State
        </h2>

        <section className="grid grid-cols-2 gap-3 mt-4 lg:flex lg:gap-2">
          {[
            {
              title: "Free Cash",
              value: walletLoading ? "Loading..." : `₦${freeCash.toLocaleString()}`,
              color: "text-gray-800"
            },
            {
              title: "Stress Index",
              value: `${Math.round(stressIndex)}/100`,
              color: stressIndex > 60 ? "text-red-500" : stressIndex > 30 ? "text-yellow-500" : "text-emerald-500",
            },
            {
              title: "Bayse Fear",
              value: `${Math.round(bayseFear)}%`,
              color: "text-orange-400"
            },
            {
              title: "ZELTA Model",
              value: `${Math.round(zeltaModel)}%`,
              color: "text-emerald-500"
            },
          ].map((item, i) => (
            <div
              key={i}
              className="border-2 border-gray-100 bg-white rounded-2xl p-3 flex flex-col justify-center lg:w-[40%]"
            >
              <h3 className="text-gray-500 text-xs md:text-sm">{item.title}</h3>
              <p className={`font-bold text-lg md:text-xl ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>
      </div>

      {/* SIMULATOR TABS */}
      <div className="mt-6 bg-white border-2 border-gray-100 rounded-2xl p-4 lg:p-6">
        {/* Tab Navigation */}
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

        {/* Side Hustle Simulator */}
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
                <p className="text-gray-500 text-sm md:text-md">
                  Test your business idea with Bayesian projections
                </p>
              </div>
            </div>

            {/* Investment Amount */}
            <div className="mb-4">
              <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                Investment Amount (₦)
              </label>
              <input
                type="number"
                value={sideHustleForm.investment_amount || ""}
                onChange={(e) => setSideHustleForm(prev => ({
                  ...prev,
                  investment_amount: Number(e.target.value)
                }))}
                placeholder="Enter amount to invest"
                className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2 focus:transition-all focus:duration-300"
                min="0"
                max={freeCash}
                required
              />
              <p className="text-gray-500 text-xs md:text-sm mt-1">
                Available free cash: ₦{freeCash.toLocaleString()}
              </p>
            </div>

            {/* Business Type */}
            <div className="mb-4">
              <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                Business Type
              </label>
              <select
                value={sideHustleForm.hustle_type}
                onChange={(e) => setSideHustleForm(prev => ({
                  ...prev,
                  hustle_type: e.target.value
                }))}
                className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2 focus:transition-all focus:duration-300"
              >
                <option value="catering">Catering</option>
                <option value="reselling">Reselling</option>
                <option value="freelancing">Freelancing</option>
                <option value="content_creation">Content Creation</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Revenue Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Min Expected Revenue (₦)
                </label>
                <input
                  type="number"
                  value={sideHustleForm.expected_revenue_min || ""}
                  onChange={(e) => setSideHustleForm(prev => ({
                    ...prev,
                    expected_revenue_min: Number(e.target.value)
                  }))}
                  placeholder="Minimum expected"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2 focus:transition-all focus:duration-300"
                  min="0"
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
                  onChange={(e) => setSideHustleForm(prev => ({
                    ...prev,
                    expected_revenue_max: Number(e.target.value)
                  }))}
                  placeholder="Maximum expected"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2 focus:transition-all focus:duration-300"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Time Horizon & Fixed Costs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Time Horizon (Weeks)
                </label>
                <input
                  type="number"
                  value={sideHustleForm.time_horizon_weeks}
                  onChange={(e) => setSideHustleForm(prev => ({
                    ...prev,
                    time_horizon_weeks: Number(e.target.value)
                  }))}
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2 focus:transition-all focus:duration-300"
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
                  onChange={(e) => setSideHustleForm(prev => ({
                    ...prev,
                    fixed_costs: Number(e.target.value)
                  }))}
                  placeholder="Optional"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-emerald-500 focus:border-2 focus:transition-all focus:duration-300"
                  min="0"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sideHustleSim.loading}
              className="w-full cursor-pointer hover:bg-emerald-400 h-12 bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {sideHustleSim.loading ? "Running Simulation..." : "Run Bayesian Simulation"}
            </button>
          </form>
        )}

        {/* Savings Simulator */}
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
                <p className="text-gray-500 text-sm md:text-md">
                  Project your savings trajectory against upcoming obligations
                </p>
              </div>
            </div>

            {/* Weekly Savings & Target */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                  Weekly Savings Amount (₦)
                </label>
                <input
                  type="number"
                  value={savingsForm.weekly_savings_amount || ""}
                  onChange={(e) => setSavingsForm(prev => ({
                    ...prev,
                    weekly_savings_amount: Number(e.target.value)
                  }))}
                  placeholder="How much per week?"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-blue-500 focus:border-2 focus:transition-all focus:duration-300"
                  min="0"
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
                  onChange={(e) => setSavingsForm(prev => ({
                    ...prev,
                    target_amount: Number(e.target.value)
                  }))}
                  placeholder="Savings goal"
                  className="bg-gray-100 w-full h-12 px-4 outline-none rounded-2xl focus:border-blue-500 focus:border-2 focus:transition-all focus:duration-300"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Upcoming Obligations - Simplified for now */}
            <div className="mb-6">
              <label className="block text-gray-800 font-bold text-sm md:text-base mb-2">
                Upcoming Obligations
              </label>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">
                  Upcoming fee obligations will be automatically loaded from your profile.
                  The simulation will show risk levels (green/amber/red) based on your savings rate vs. upcoming payments.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={savingsSim.loading}
              className="w-full cursor-pointer hover:bg-blue-400 h-12 bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Target className="w-5 h-5" />
              {savingsSim.loading ? "Running Projection..." : "Run Savings Projection"}
            </button>
          </form>
        )}
      </div>

      {/* SIMULATION RESULTS */}
      {sideHustleSim.data && sideHustleSim.data.success && (
        <SimulationResults result={sideHustleSim.data} />
      )}

      {savingsSim.data && savingsSim.data.success && (
        <SimulationResults result={savingsSim.data} />
      )}

      {/* ERROR DISPLAY */}
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

      {/* INFO */}
      <div className="border-2 border-gray-100 w-full mt-6 bg-white rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" />
          <h2 className="text-sm md:text-md font-bold text-gray-800">
            How Portfolio Simulation Works
          </h2>
        </div>

        <p className="text-gray-500 mt-2 text-xs md:text-sm leading-relaxed">
          ZELTA runs Bayesian Monte Carlo projections (1,000 simulations) using
          your input variables. Kelly Criterion then sizes the safe allocation based on
          current Bayse crowd signals and your stress index. The simulation adjusts
          in real-time when Bayse market prices shift, giving you probabilistic
          decision support before committing real capital.
        </p>
      </div>

      {/* FLOATING BUTTON — opens co-pilot */}
      <button
        onClick={() => router.push("/dashboard/co-pilot")}
        className="fixed bottom-6 right-6 bg-emerald-500 rounded-full w-14 h-14 z-50 flex items-center justify-center shadow-lg hover:bg-emerald-400 transition-all"
        title="Open Co-pilot"
      >
        <MessageSquare className="text-white w-5 h-5" />
      </button>
    </div>
  );
}

export default SimulationsPage;