"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASELINE_RUNWAY_DAYS = 18;
// Illustrative only — the real Twin runs deterministic cash-flow math on
// a student's actual transactions. This preview exists to make the
// mechanic tangible before signup, not to forecast anything real.
const DAYS_LOST_PER_1000 = 0.55;

function riskFor(days: number) {
  if (days >= 10) return { label: "Healthy runway", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700" };
  if (days >= 4) return { label: "Getting tight", color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700" };
  return { label: "Shortfall risk", color: "#ef4444", bg: "bg-red-50", text: "text-red-700" };
}

export default function FutureLabPreview() {
  const [amount, setAmount] = useState(8000);

  const remainingDays = useMemo(() => {
    const raw = BASELINE_RUNWAY_DAYS - (amount / 1000) * DAYS_LOST_PER_1000;
    return Math.max(0, Math.round(raw * 10) / 10);
  }, [amount]);

  const risk = riskFor(remainingDays);
  const gaugePct = Math.min(100, (remainingDays / BASELINE_RUNWAY_DAYS) * 100);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
      <p className="text-sm text-gray-500">Try it — Future Lab, simplified</p>
      <h3 className="mt-2 text-xl font-semibold text-gray-900 sm:text-2xl">
        What happens if you spend this today?
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Drag the slider. This preview uses illustrative math — your real Twin runs on your actual
        transactions once you sign up.
      </p>

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <label htmlFor="future-lab-amount" className="text-sm font-medium text-gray-700">
            Hypothetical spend
          </label>
          <span
            className="text-lg font-semibold tabular-nums text-gray-900"
            style={{ fontFamily: "var(--font-fira-code)" }}
          >
            ₦{amount.toLocaleString()}
          </span>
        </div>
        <input
          id="future-lab-amount"
          type="range"
          min={0}
          max={30000}
          step={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-emerald-500"
          aria-valuetext={`₦${amount.toLocaleString()} hypothetical spend`}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>₦0</span>
          <span>₦30,000</span>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-6">
        <div>
          <AnimatePresence mode="wait">
            <motion.p
              key={risk.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${risk.bg} ${risk.text}`}
            >
              {risk.label}
            </motion.p>
          </AnimatePresence>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-gray-900">
            {remainingDays}
            <span className="ml-1 text-base font-normal text-gray-500">days of runway left</span>
          </p>
        </div>

        <div className="flex h-24 w-3 shrink-0 flex-col justify-end overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="w-full rounded-full"
            style={{ backgroundColor: risk.color }}
            initial={false}
            animate={{ height: `${gaugePct}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          />
        </div>
      </div>
    </div>
  );
}
