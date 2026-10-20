"use client";
import { useState } from "react";
import { Card, Button, Notice, Pill, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { naira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { SavingsSim } from "@/lib/types";

export default function EarnPage() {
  const gigs = useApi(() => api.gigs());
  const [weekly, setWeekly] = useState(""); const [target, setTarget] = useState("");
  const [sim, setSim] = useState<SavingsSim | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const field = "mt-1 w-full rounded-2xl border-2 border-line bg-paper px-4 min-h-12 text-[17px] focus:border-indigo outline-none";

  async function run(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { setSim(await api.simulateSavings(Number(weekly), Number(target))); } catch (x) { setErr(x instanceof Error ? x.message : "Could not run that."); setSim(null); } finally { setBusy(false); }
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-5">
      <h1 className="text-3xl font-bold">Earn and save</h1>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Open gigs</h2>
        {gigs.loading ? <Skeleton className="h-28" /> : gigs.error ? <Notice title="Can't load gigs" action={<Button onClick={gigs.reload}>Try again</Button>}>{gigs.error}</Notice>
          : gigs.data && gigs.data.length > 0 ? <ul className="grid gap-3 md:grid-cols-2">{gigs.data.map((g) => (
            <li key={g.id}><Card className="h-full"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold leading-snug">{g.task}</h3><span className="num whitespace-nowrap text-xl font-bold text-mint-deep">{g.payout > 0 ? naira(g.payout) : g.payout_raw || "Ask"}</span></div>
              <p className="mt-1 text-soft">{g.location}{g.time_estimate ? ` · ${g.time_estimate}` : ""}</p>
              {g.skills_required.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{g.skills_required.map((s) => <Pill key={s}>{s}</Pill>)}</div>}</Card></li>))}</ul>
            : <Notice mood="sleepy" title="No open gigs right now">Check back later. New gigs appear here as they are posted.</Notice>}
      </section>
      <section><h2 className="mb-3 text-xl font-semibold">How long to reach a savings goal?</h2>
        <Card><form onSubmit={run} className="grid gap-4 md:grid-cols-2">
          <label className="font-semibold">I can set aside each week (₦)<input className={field} inputMode="numeric" value={weekly} onChange={(e) => setWeekly(e.target.value.replace(/\D/g, ""))} /></label>
          <label className="font-semibold">My goal (₦)<input className={field} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} /></label>
          <Button type="submit" className="md:col-span-2" disabled={busy || !(Number(weekly) > 0 && Number(target) > 0)}>{busy ? "Working it out…" : "Run the numbers"}</Button></form>
          {err && <p role="alert" className="mt-3 font-semibold text-coral-deep">{err}</p>}
          {sim && <div className="mt-4 space-y-1 rounded-2xl bg-indigo-tint p-4"><p className="num text-2xl font-bold">{sim.weeks_to_target} weeks to your goal</p><p>{sim.plain_english}</p>
            <p className="text-sm text-soft">Weeks that look safe: {sim.green_weeks} · tight: {sim.amber_weeks} · risky: {sim.red_weeks}. This is a projection, not a promise.</p></div>}</Card>
      </section>
    </main>
  );
}
