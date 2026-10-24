"use client";
import { useState } from "react";
import QuickAdd, { type AddKind } from "@/components/QuickAdd";
import { ClothStrip, SpendingCloth } from "@/components/Cloth";
import GuardianCard from "@/components/GuardianCard";
import WhatIfCard from "@/components/WhatIfCard";
import { Button, Card, Notice, Pill, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { kobo, longDate, naira, shortDate, titleCase } from "@/lib/format";
import { useApi } from "@/lib/useApi";

const TONE = { green: "mint", amber: "danfo", red: "coral" } as const;
const WORD = { green: "On track", amber: "Watch this", red: "High" } as const;

export default function TwinPage() {
  const wallet = useApi(() => api.wallet());
  const stress = useApi(() => api.stress());
  const twin = useApi(() => api.twin());
  const [add, setAdd] = useState<AddKind | null>(null);

  if (wallet.loading) return <main className="grid gap-4 p-5 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-64 md:col-span-2" /></main>;
  if (wallet.error || !wallet.data) return <main className="mx-auto max-w-xl p-5"><Notice title="Can't load your Twin" action={<Button onClick={wallet.reload}>Try again</Button>}>{wallet.error}</Notice></main>;
  const w = wallet.data;
  const t = twin.data;
  const days = t?.summary.runway_days ?? null;
  const series = t?.position?.daily_spend_28d;
  const recs = t?.recommendations?.recommendations ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-4xl font-extrabold">Your Twin</h1><p className="text-soft">{t ? "From what you have told ZELTA. Not a live bank link." : "A picture of your money."}</p></div>
        <div className="flex gap-2"><Button variant="quiet" className="min-h-11 px-4" onClick={() => setAdd("income")}>Money in</Button><Button variant="quiet" className="min-h-11 px-4" onClick={() => setAdd("expense")}>Money out</Button></div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="cloth oniko dyed md:col-span-2 overflow-hidden rounded-[26px] p-6" style={{ ["--stitch" as string]: "rgba(245,239,226,.10)" }}>
          {twin.loading ? <Skeleton className="h-28 bg-white/20" /> : days != null ? (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-lg opacity-80">At this pace your money lasts about</p>
                <p className="num text-7xl font-extrabold leading-none md:text-8xl">{Math.round(days)}<span className="ml-2 text-4xl font-extrabold opacity-80">days</span></p>
                {t?.forecast?.likely_runout_date && <p className="mt-2 text-[17px] opacity-90">Around {longDate(t.forecast.likely_runout_date)}{t.forecast.runout_range && t.forecast.runout_range.length > 1 && t.forecast.runout_range[0] !== t.forecast.runout_range[t.forecast.runout_range.length - 1] ? `, between ${longDate(t.forecast.runout_range[0])} and ${longDate(t.forecast.runout_range[t.forecast.runout_range.length - 1])}` : ""}. No new income counted.</p>}</div>
              <div className="text-right"><p className="opacity-80">In your Twin</p><p className="num text-4xl font-extrabold">{kobo(t?.summary.total_connected_money)}</p></div>
            </div>
          ) : (
            <div><p className="text-lg opacity-80">Your balance</p><p className="num text-6xl font-extrabold">{naira(w.total_balance)}</p>
              <p className="mt-2 opacity-90">{twin.error ? "Runway is not available right now." : "Runway needs a little more spending history."} <strong>{naira(w.free_cash)}</strong> free · <strong>{naira(w.locked_amount)}</strong> set aside.</p></div>
          )}
        </section>
        {t?.position && t.position.total_connected_money && <Card className="md:col-span-2"><h2 className="mb-3 text-xl font-bold">Your balance, as cloth</h2><ClothStrip position={t.position} /></Card>}
        <GuardianCard />
        <WhatIfCard />
        {series && series.length > 0 ? <Card><h2 className="mb-3 text-xl font-bold">Last 28 days</h2><SpendingCloth series={series} /></Card>
          : <Card><p className="text-soft">Spending per week</p><p className="num text-4xl font-bold">{naira(w.weekly_burn_rate)}</p></Card>}
        {t?.forecast?.upcoming_expenses && t.forecast.upcoming_expenses.length > 0 && (
          <Card><h2 className="mb-2 text-xl font-bold">Coming up</h2><ul className="divide-y divide-line">{t.forecast.upcoming_expenses.map((e) => (
            <li key={e.name + e.due} className="flex items-center justify-between py-2.5"><span><strong>{e.name}</strong><span className="block text-sm text-soft">{longDate(e.due)}</span></span><span className="num font-bold">{kobo(e.amount)}</span></li>))}</ul></Card>)}
        {recs.length > 0 && (
          <Card className="bg-danfo-tint"><h2 className="mb-2 text-xl font-bold">Zel suggests</h2><ul className="space-y-3">{recs.map((r) => (
            <li key={r.kind}><p className="text-[17px] font-bold">{r.title}</p>{r.effect && <p>{titleCase(r.effect)}.</p>}<p className="text-sm text-soft">Because {r.because.join("; ")}.</p></li>))}</ul></Card>)}
        
        <Card className="md:col-span-2">
          <h2 className="mb-3 text-xl font-bold">Where it goes</h2>
          {w.spending_heat.length === 0 ? <p className="text-soft">Log a few expenses and your spending breakdown shows here.</p> : (
            <ul className="space-y-3">{w.spending_heat.map((h) => (
              <li key={h.category}><div className="flex items-center justify-between"><span className="font-semibold">{titleCase(h.category)}</span><span className="flex items-center gap-2"><span className="num">{naira(h.amount)}</span><Pill tone={TONE[h.status]}>{WORD[h.status]}</Pill></span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-line" role="img" aria-label={`${Math.round(h.percentage)} percent of spending`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, h.percentage)}%`, background: `var(--${h.status === "green" ? "mint" : h.status === "amber" ? "danfo" : "coral"})` }} /></div></li>))}</ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-xl font-bold">Market mood</h2>
          {stress.loading ? <Skeleton className="h-12" /> : stress.data ? <p><Pill tone={stress.data.level === "CALM" ? "mint" : stress.data.level === "MODERATE" ? "danfo" : "coral"}>{titleCase(stress.data.level.toLowerCase())}</Pill> <span className="num ml-2 font-bold">{Math.round(stress.data.stress_index)}</span><span className="text-soft"> out of 100</span></p>
            : <p className="text-soft">Not available right now.</p>}
        </Card>
        {w.bq_alerts.length > 0 && <Card className="md:col-span-2 bg-danfo-tint"><h2 className="mb-2 text-xl font-bold">Heads up</h2><ul className="list-disc space-y-1 pl-5">{w.bq_alerts.map((a) => <li key={a}>{a}</li>)}</ul></Card>}

        <Card className="md:col-span-2">
          <h2 className="mb-3 text-xl font-bold">Recent activity</h2>
          {w.recent_transactions.length === 0 ? <p className="text-soft">Nothing yet. Log money in or out and it shows here.</p> : (
            <ul className="divide-y divide-line">{w.recent_transactions.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3"><div><p className="font-semibold">{t.description || titleCase(t.category)}</p><p className="text-sm text-soft">{titleCase(t.category)} · {shortDate(t.date)}</p></div>
                <p className={`num text-lg font-bold ${t.type === "income" ? "text-mint-deep" : ""}`}>{t.type === "income" ? "+" : "−"}{naira(t.amount)}</p></li>))}</ul>
          )}
        </Card>
      </div>
      {add && <QuickAdd kind={add} onClose={() => setAdd(null)} onDone={wallet.reload} />}
    </main>
  );
}
