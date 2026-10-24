"use client";
import { useState } from "react";
import { Button, Card } from "./ui";
import { api } from "@/lib/api";
import { longDate } from "@/lib/format";
import type { WhatIfOutcome } from "@/lib/types";

const KINDS = [
  { id: "spend_less_weekly", label: "Spend less each week" },
  { id: "save_weekly", label: "Set aside each week" },
  { id: "receive", label: "Receive money" },
  { id: "unexpected_expense", label: "Unexpected cost" },
] as const;

/** "What if": the engine reruns your forecast with one change. Nothing is saved or changed in your account. */
export default function WhatIfCard() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("spend_less_weekly");
  const [amount, setAmount] = useState("2000"); const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<WhatIfOutcome | null>(null); const [err, setErr] = useState("");
  async function run(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) { setErr("Enter an amount in naira."); return; }
    setBusy(true); setErr("");
    try {
      const r = await api.whatif(kind, n);
      if (!r.feasible || r.outcomes.length === 0) { setOut(null); setErr("That scenario can't be run with your current data."); }
      else setOut(r.outcomes[0]);
    } catch (x) { setOut(null); setErr(x instanceof Error ? x.message : "Could not run that."); } finally { setBusy(false); }
  }
  const diff = out && out.runway_before_days != null && out.runway_after_days != null ? out.runway_after_days - out.runway_before_days : null;
  return (
    <Card className="md:col-span-2">
      <h2 className="text-xl font-bold">What if…</h2>
      <p className="text-soft">Try one change and see how many days it adds or takes away. Nothing changes in your account.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Scenario">
        {KINDS.map((k) => <button key={k.id} role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
          className={`min-h-10 rounded-full border-[1.5px] px-4 font-semibold ${kind === k.id ? "border-indigo bg-indigo text-white" : "border-line bg-paper text-ink"}`}>{k.label}</button>)}
      </div>
      <form onSubmit={run} className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="w-amt">Amount in naira</label>
        <span className="flex min-h-12 flex-1 items-center rounded-[14px] border-[1.5px] border-line bg-chalk px-3 focus-within:border-indigo">
          <span className="num mr-1 text-soft">₦</span><input id="w-amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="num w-full bg-transparent text-lg outline-none" /></span>
        <Button type="submit" disabled={busy || !amount.trim()}>{busy ? "Running" : "Run it"}</Button>
      </form>
      {err && <p role="alert" className="mt-2 font-semibold text-coral-deep">{err}</p>}
      {out && (
        <div className="pop mt-4 rounded-2xl bg-indigo-tint p-4" role="status">
          <p className="text-soft">{out.scenario}</p>
          <p className="num text-3xl font-extrabold text-indigo">
            {out.runway_before_days != null ? Math.round(out.runway_before_days) : "?"} → {out.runway_after_days != null ? Math.round(out.runway_after_days) : "?"} days
            {diff != null && Math.abs(diff) >= 0.5 && <span className="ml-2 text-lg font-bold">({diff > 0 ? "+" : "−"}{Math.round(Math.abs(diff))})</span>}</p>
          {out.runout_after && <p>You would run out around {longDate(out.runout_after)}{out.runout_before ? `, instead of ${longDate(out.runout_before)}` : ""}.</p>}
          <p className="mt-1 text-sm text-soft">A projection from your own numbers, not a promise.</p>
        </div>)}
    </Card>
  );
}
