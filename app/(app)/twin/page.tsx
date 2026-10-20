"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import QuickAdd, { type AddKind } from "@/components/QuickAdd";
import { Button, Card, Notice, Pill, Ring, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { naira, shortDate, titleCase } from "@/lib/format";
import { useApi } from "@/lib/useApi";

const TONE = { green: "mint", amber: "danfo", red: "coral" } as const;
const WORD = { green: "On track", amber: "Watch this", red: "High" } as const;

export default function TwinPage() {
  const wallet = useApi(() => api.wallet());
  const stress = useApi(() => api.stress());
  const [add, setAdd] = useState<AddKind | null>(null);

  if (wallet.loading) return <main className="grid gap-4 p-5 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-64 md:col-span-2" /></main>;
  if (wallet.error || !wallet.data) return <main className="mx-auto max-w-xl p-5"><Notice title="Can't load your Twin" action={<Button onClick={wallet.reload}>Try again</Button>}>{wallet.error}</Notice></main>;
  const w = wallet.data;
  const freeShare = w.total_balance > 0 ? w.free_cash / w.total_balance : 0;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Your Twin</h1>
        <div className="flex gap-2"><Button variant="quiet" className="min-h-11 px-4" onClick={() => setAdd("income")}>Money in</Button><Button variant="quiet" className="min-h-11 px-4" onClick={() => setAdd("expense")}>Money out</Button></div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-center gap-5">
          <Ring value={freeShare} size={128} tone="var(--indigo)"><span className="num block text-sm text-soft">free</span><span className="num block text-lg font-bold">{Math.round(freeShare * 100)}%</span></Ring>
          <div><p className="text-soft">Total balance</p><p className="num text-4xl font-bold">{naira(w.total_balance)}</p>
            <p className="mt-1 text-[17px]"><strong>{naira(w.free_cash)}</strong> free · <strong>{naira(w.locked_amount)}</strong> set aside</p></div>
        </Card>
        <Card>
          <p className="text-soft">Spending each week</p>
          <p className="num text-4xl font-bold">{naira(w.weekly_burn_rate)}</p>
          <p className="mt-1 text-soft">Income so far {naira(w.total_income)}, spending {naira(w.total_expenses)}.</p>
        </Card>

        <Card className="md:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Where it goes</h2>
          {w.spending_heat.length === 0 ? <p className="text-soft">Log a few expenses and your spending breakdown shows here.</p> : (
            <ul className="space-y-3">{w.spending_heat.map((h) => (
              <li key={h.category}><div className="flex items-center justify-between"><span className="font-semibold">{titleCase(h.category)}</span><span className="flex items-center gap-2"><span className="num">{naira(h.amount)}</span><Pill tone={TONE[h.status]}>{WORD[h.status]}</Pill></span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-line" role="img" aria-label={`${Math.round(h.percentage)} percent of spending`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, h.percentage)}%`, background: `var(--${h.status === "green" ? "mint" : h.status === "amber" ? "danfo" : "coral"})` }} /></div></li>))}</ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-xl font-semibold">Market mood</h2>
          {stress.loading ? <Skeleton className="h-12" /> : stress.data ? <p><Pill tone={stress.data.level === "CALM" ? "mint" : stress.data.level === "MODERATE" ? "danfo" : "coral"}>{titleCase(stress.data.level.toLowerCase())}</Pill> <span className="num ml-2 font-bold">{Math.round(stress.data.stress_index)}</span><span className="text-soft"> out of 100</span></p>
            : <p className="text-soft">Not available right now.</p>}
        </Card>
        <Card className="border-dashed">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold"><Lock size={18} />Runway and forecast</h2>
          <p className="text-soft">How many days your money lasts needs connected accounts and a spending history. It appears here once they are linked.</p>
        </Card>

        {w.bq_alerts.length > 0 && <Card className="md:col-span-2 bg-danfo-tint"><h2 className="mb-2 text-xl font-semibold">Heads up</h2><ul className="list-disc space-y-1 pl-5">{w.bq_alerts.map((a) => <li key={a}>{a}</li>)}</ul></Card>}

        <Card className="md:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Recent activity</h2>
          {w.recent_transactions.length === 0 ? <p className="text-soft">Nothing yet. Log money in or out and it shows here.</p> : (
            <ul className="divide-y-2 divide-line">{w.recent_transactions.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3"><div><p className="font-semibold">{t.description || titleCase(t.category)}</p><p className="text-sm text-soft">{titleCase(t.category)} · {shortDate(t.date)}</p></div>
                <p className={`num text-lg font-bold ${t.type === "income" ? "text-mint-deep" : ""}`}>{t.type === "income" ? "+" : "−"}{naira(t.amount)}</p></li>))}</ul>
          )}
        </Card>
      </div>
      {add && <QuickAdd kind={add} onClose={() => setAdd(null)} onDone={wallet.reload} />}
    </main>
  );
}
