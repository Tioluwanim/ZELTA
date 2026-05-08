"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "zelta_onboarding_seen_v1";

export default function OnboardingOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  const close = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Welcome to ZELTA</h2>
        <p className="mt-1 text-sm text-gray-600">
          Here is how to use your dashboard in under 30 seconds.
        </p>

        <div className="mt-4 space-y-3 text-sm text-gray-700">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-700">1) Weekly Recommendation</p>
            <p className="text-xs">Start here each week for your clearest next step.</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3">
            <p className="font-semibold text-orange-700">2) Market Emotion / Bayse</p>
            <p className="text-xs">
              Bayse measures emotional market behavior and crowd panic patterns.
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="font-semibold text-blue-700">3) AI Assistant</p>
            <p className="text-xs">Confused? Ask ZELTA anything in Co-pilot.</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 p-3 text-xs text-gray-600">
          <p>
            <strong>Risk preferences:</strong> Conservative = protect money first, Moderate =
            balance saving and growth, Aggressive = accept more ups and downs for higher upside.
          </p>
        </div>

        <button
          onClick={close}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Start exploring
        </button>
      </div>
    </div>
  );
}
