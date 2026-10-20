"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Flame, Lock, Plus } from "lucide-react";
import Zel from "@/components/Zel";
import QuickAdd, { type AddKind } from "@/components/QuickAdd";
import { useProfile } from "@/components/ProfileContext";
import { Button, Notice, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { naira } from "@/lib/format";
import { useCheckIn } from "@/lib/streak";
import { useApi } from "@/lib/useApi";

interface Node { id: string; title: string; hint: string; done: boolean; act: () => void }
const OFFSETS = [0, 46, 64, 46, 0, -46, -64, -46];

export default function PathPage() {
  const { profile } = useProfile();
  const router = useRouter();
  const wallet = useApi(() => api.wallet());
  const [add, setAdd] = useState<AddKind | null>(null);
  const { streak, asked } = useCheckIn();

  if (wallet.loading) return <main className="mx-auto max-w-md space-y-4 p-5"><Skeleton className="h-28" /><Skeleton className="h-96" /></main>;
  if (wallet.error || !wallet.data) return <main className="mx-auto max-w-md p-5"><Notice title="Can't load your path" action={<Button onClick={wallet.reload}>Try again</Button>}>{wallet.error}</Notice></main>;
  const w = wallet.data;

  const weekCovered = w.weekly_burn_rate > 0 && w.free_cash >= w.weekly_burn_rate;
  const nodes: Node[] = [
    { id: "bills", title: "Add your bills", hint: "Tell Zel what is due and when", done: profile.financial.fee_obligations.length > 0, act: () => router.push("/me#bills") },
    { id: "log", title: "Log your money", hint: "Record what came in or went out", done: w.recent_transactions.length > 0, act: () => setAdd("expense") },
    { id: "week", title: "Cover one week of spending", hint: `One week is about ${naira(w.weekly_burn_rate)}`, done: weekCovered, act: () => router.push("/twin") },
    { id: "goal", title: "Set money aside", hint: "Lock an amount for something that matters", done: w.savings_goals.length > 0, act: () => setAdd("goal") },
    { id: "ask", title: "Ask Zel a question", hint: "Can I afford it? Where did it go?", done: asked, act: () => router.push("/coach") },
    { id: "streak", title: "Check in 7 days in a row", hint: `${Math.min(streak, 7)} of 7 days`, done: streak >= 7, act: () => undefined },
  ];
  const current = nodes.findIndex((n) => !n.done);
  const short = w.weekly_burn_rate > 0 && !weekCovered;

  return (
    <main className="mx-auto max-w-md px-5 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hi {profile.name.split(" ")[0]}</h1>
        <div className="flex items-center gap-2">
          <span className="flex min-h-10 items-center gap-1 rounded-2xl bg-danfo-tint px-3 font-display font-semibold" aria-label={`${streak} day check-in streak`}><Flame size={20} className="text-danfo-deep" />{streak}</span>
        </div>
      </header>
      <section className="mt-4 flex items-center gap-3 rounded-3xl border-2 border-line bg-paper p-4">
        <Zel mood={short ? "worried" : current === -1 ? "cheer" : "happy"} size={72} bob />
        <p className="text-[17px] font-semibold leading-snug">
          {short ? `Your free cash (${naira(w.free_cash)}) is below one week of spending. Small steps first.`
            : current === -1 ? "Every step is done. Keep checking in." : `Next up: ${nodes[current].title}.`}
        </p>
      </section>

      <ol className="mt-6 flex flex-col items-center gap-7 pb-10">
        {nodes.map((n, i) => {
          const state = n.done ? "done" : i === current ? "current" : "locked";
          const color = state === "done" ? "bg-mint text-white shadow-[0_6px_0_0_var(--mint-deep)]" : state === "current" ? "bg-indigo text-white shadow-[0_6px_0_0_var(--indigo-deep)]" : "bg-line text-soft shadow-[0_6px_0_0_#cfd0e0]";
          return (
            <li key={n.id} style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }} className="flex flex-col items-center text-center">
              <button onClick={n.act} disabled={state === "locked"} aria-label={`${n.title}. ${state === "done" ? "Done" : state === "current" ? "Next step" : "Locked"}. ${n.hint}`}
                className={`btn relative grid h-20 w-20 place-items-center rounded-full ${color} ${state === "current" ? "ring-8 ring-indigo/15" : ""} disabled:cursor-not-allowed`}>
                {state === "done" ? <Check size={34} strokeWidth={3.5} /> : state === "locked" ? <Lock size={28} /> : <Plus size={34} strokeWidth={3} />}
              </button>
              <span className="mt-3 max-w-44 font-display text-lg font-semibold leading-tight">{n.title}</span>
              {state !== "locked" && <span className="max-w-48 text-sm text-soft">{n.hint}</span>}
            </li>
          );
        })}
      </ol>
      <p className="pb-6 text-center text-sm text-soft">Your streak counts the days you open ZELTA. It never asks you to move money. <Link href="/twin" className="font-semibold text-indigo underline">See your Twin</Link></p>
      {add && <QuickAdd kind={add} onClose={() => setAdd(null)} onDone={wallet.reload} />}
    </main>
  );
}
