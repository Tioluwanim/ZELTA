"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { CreditCard, Target, Bell, ShieldCheck, ChevronRight, LogOut } from "lucide-react";
import { auth } from "@/firebase/index";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useUpdateProfile } from "@/hooks/zelta";
import { useZelta } from "@/context/zeltaContext";

// ─── Helpers ───────────────────────────────────────────────────────

function StatPill({ label, value, valueColor = "text-gray-900" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${on ? "bg-[#10b981]" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ─── Main content (needs useSearchParams so wrap in Suspense) ───────

function ProfileContent() {
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  const { profile } = useZelta();
  const { updateProfile } = useUpdateProfile();

  const [section, setSection] = useState(
    searchParams.get("tab") === "settings" ? "notifications" : "profile"
  );

  // Initialize from profile data once loaded — avoids stale empty defaults
  const [capitalRange, setCapitalRange] = useState("₦10,000 - ₦50,000");
  const [risk, setRisk] = useState<"low" | "moderate" | "high">("moderate");
  const [income, setIncome] = useState("");
  const [examDate, setExamDate] = useState("");
  const [goal, setGoal] = useState("Build Emergency Fund");
  const [aggression, setAggression] = useState(50);
  const [stressSens, setStressSens] = useState(60);
  const [notifs, setNotifs] = useState({
    decisionAlerts: true,
    stressIndex: true,
    bayse: false,
    goalProgress: true,
    behavioral: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [synced, setSynced] = useState(false);

  // Sync local state from API once profile loads (runs once)
  useEffect(() => {
    if (profile.data && !synced) {
      setCapitalRange(profile.data.financial?.capital_range || "₦10,000 - ₦50,000");
      setRisk(profile.data.financial?.risk_tolerance || "moderate");
      setIncome(String(profile.data.financial?.monthly_income || ""));
      setExamDate((profile.data.financial as any)?.next_exam_date || "");
      setGoal(profile.data.preferences?.primary_goal || "Build Emergency Fund");
      setAggression(profile.data.preferences?.decision_aggressiveness ?? 50);
      setStressSens(profile.data.preferences?.stress_sensitivity ?? 60);
      setNotifs({
        decisionAlerts: profile.data.notifications?.decision_reminders ?? true,
        stressIndex: profile.data.notifications?.stress_alerts ?? true,
        bayse: profile.data.notifications?.bayse_spike_alerts ?? false,
        goalProgress: profile.data.notifications?.weekly_bq_report ?? true,
        behavioral: false,
      });
      setSynced(true);
    }
  }, [profile.data, synced]);

  const name = user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const since = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "March 2026";

  const NAV = [
    { key: "profile", icon: <CreditCard className="h-4 w-4" />, label: "Financial Profile" },
    { key: "goals",   icon: <Target className="h-4 w-4" />,      label: "Goals" },
    { key: "notifications", icon: <Bell className="h-4 w-4" />,  label: "Notifications" },
    { key: "security", icon: <ShieldCheck className="h-4 w-4" />, label: "Security" },
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await updateProfile({
      financial: {
        capital_range: capitalRange,
        risk_tolerance: risk as "low" | "moderate" | "high",
        monthly_income: Number(income) || undefined,
        next_exam_date: examDate || undefined,
      } as any,
    });
    setIsSaving(false);
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    await updateProfile({
      preferences: {
        primary_goal: goal,
        decision_aggressiveness: aggression,
        stress_sensitivity: stressSens,
      },
    });
    setIsSaving(false);
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    await updateProfile({
      notifications: {
        stress_alerts: notifs.stressIndex,
        weekly_bq_report: notifs.goalProgress,
        decision_reminders: notifs.decisionAlerts,
        bayse_spike_alerts: notifs.bayse,
      },
    });
    setIsSaving(false);
  };

  if (profile.loading) {
    return (
      <div className="pb-10">
        <PageHeader title="Profile" description="Manage your account settings" />
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader title="Profile" description="Manage your account settings" />

      {/* Profile card */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#10b981] text-xl font-bold text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{profile.data?.name || name}</h2>
              <p className="text-sm text-gray-500">{profile.data?.department || "Nigerian Student"}</p>
            </div>
          </div>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Edit
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatPill label="Member Since" value={since} />
          <StatPill label="University" value={profile.data?.university || "Not set"} />
          <StatPill label="Risk Level" value={(profile.data?.financial?.risk_tolerance || "moderate").toUpperCase()} valueColor="text-[#10b981]" />
        </div>
      </div>

      {/* Nav tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {NAV.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${section === key ? "bg-[#10b981] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Financial Profile */}
      {section === "profile" && (
        <section className="mt-5 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 lg:p-6">
          <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-gray-500" /><h3 className="font-bold text-gray-800">Financial Profile</h3></div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Available Capital Range</p>
            <div className="flex flex-wrap gap-2">
              {["₦0 - ₦10,000", "₦10,000 - ₦50,000", "₦50,000+"].map((opt) => (
                <button key={opt} onClick={() => setCapitalRange(opt)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${capitalRange === opt ? "border-[#10b981] bg-[#10b981] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#10b981]"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Risk Preference</p>
            <div className="flex gap-2">
              {(["low", "moderate", "high"] as const).map((opt) => (
                <button key={opt} onClick={() => setRisk(opt)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition capitalize ${risk === opt ? "border-[#10b981] bg-[#10b981] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#10b981]"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Monthly Income (Optional)</p>
            <input type="number" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="Enter amount"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Next Exam Date</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#10b981]" />
            <p className="mt-1 text-xs text-gray-400">ZELTA reduces spending limits as exams approach (λt modifier)</p>
          </div>
          <button onClick={handleSaveProfile} disabled={isSaving} className="w-full rounded-xl bg-[#10b981] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b9268] disabled:opacity-50">{isSaving ? "Saving..." : "Save Financial Profile"}</button>
        </section>
      )}

      {/* Goals */}
      {section === "goals" && (
        <section className="mt-5 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 lg:p-6">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-gray-500" /><h3 className="font-bold text-gray-800">Goals & Preferences</h3></div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Primary Financial Goal</p>
            <select value={goal} onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#10b981]">
              {["Build Emergency Fund","Build Savings","Generate Income","Grow Wealth","Pay School Fees"].map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Decision Aggressiveness</p>
              <span className="text-xs font-medium text-[#10b981]">{aggression}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs text-gray-400">Conservative</span>
              <input type="range" min={0} max={100} step={1} value={aggression} onChange={(e) => setAggression(Number(e.target.value))} className="flex-1 accent-[#10b981]" />
              <span className="shrink-0 text-xs text-gray-400">Aggressive</span>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Stress Sensitivity</p>
              <span className="text-xs font-medium text-[#10b981]">{stressSens}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs text-gray-400">Low</span>
              <input type="range" min={0} max={100} step={1} value={stressSens} onChange={(e) => setStressSens(Number(e.target.value))} className="flex-1 accent-[#10b981]" />
              <span className="shrink-0 text-xs text-gray-400">High</span>
            </div>
          </div>
          <button onClick={handleSavePreferences} disabled={isSaving} className="w-full rounded-xl bg-[#10b981] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b9268] disabled:opacity-50">{isSaving ? "Saving..." : "Save Preferences"}</button>
        </section>
      )}

      {/* Notifications */}
      {section === "notifications" && (
        <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2"><Bell className="h-5 w-5 text-gray-500" /><h3 className="font-bold text-gray-800">Notifications</h3></div>
          <div className="divide-y divide-gray-100">
            {([
              { key: "decisionAlerts" as const,  label: "Decision Alerts",       desc: "Get notified when ZELTA recommends an action" },
              { key: "stressIndex" as const,      label: "Market Panic Level Updates",  desc: "Daily summary of market-emotion levels" },
              { key: "bayse" as const,            label: "Bayse Market Signals",  desc: "Important market intelligence updates" },
              { key: "goalProgress" as const,     label: "Goal Progress",         desc: "Weekly updates on your savings goals" },
              { key: "behavioral" as const,       label: "Behavioral Insights",   desc: "Monthly behavioral pattern analysis" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <Toggle on={notifs[key]} onToggle={() => setNotifs((p) => ({ ...p, [key]: !p[key] }))} />
              </div>
            ))}
          </div>
          <button onClick={handleSaveNotifications} disabled={isSaving} className="mt-4 w-full rounded-xl bg-[#10b981] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b9268] disabled:opacity-50">{isSaving ? "Saving..." : "Save Notifications"}</button>
        </section>
      )}

      {/* Security */}
      {section === "security" && (
        <section className="mt-5 space-y-3">
          {/* Security & Privacy */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gray-500" />
              <h3 className="font-bold text-gray-800">Security & Privacy</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {["Change Password","Two-Factor Authentication","Connected Accounts","Privacy Settings","Data Export"].map((item) => (
                <button key={item} className="flex w-full items-center justify-between py-3.5 text-sm font-medium text-gray-800 transition hover:text-[#10b981]">
                  {item}<ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Help, About, Legal */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:p-6">
            <div className="divide-y divide-gray-100">
              {["Help & Support","About ZELTA","Terms & Conditions","Privacy Policy"].map((item) => (
                <button key={item} className="flex w-full items-center justify-between py-3.5 text-sm font-medium text-gray-800 transition hover:text-[#10b981]">
                  {item}<ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={async () => {
              await signOut(auth);
              // Clear the session cookie so middleware redirects to /login
              document.cookie = "zelta_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              window.location.href = "/login";
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white py-4 text-sm font-semibold text-red-500 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>

          {/* Footer */}
          <div className="pb-4 pt-2 text-center">
            <p className="text-sm font-medium text-gray-500">ZELTA v1.0.0</p>
            <p className="mt-0.5 text-xs text-gray-400">Behavioral Quantitative Financial Intelligence</p>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Default export — must be a named function component ────────────

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}