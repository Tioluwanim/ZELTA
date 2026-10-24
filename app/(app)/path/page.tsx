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
const STEP = 164;

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
        <h1 className="text-3xl font-extrabold">Hi {profile.name.split(" ")[0]}</h1>
        <div className="flex items-center gap-2">
          <span className="flex min-h-10 items-center gap-1 rounded-[14px] bg-danfo-tint px-3 font-display font-bold" aria-label={`${streak} day check-in streak`}><Flame size={20} className="text-danfo-deep" />{streak}</span>
        </div>
      </header>
      <section className="cloth alabere dyed mt-4 flex items-center gap-3 overflow-hidden rounded-[22px] p-4" style={{ ["--stitch" as string]: "rgba(245,239,226,.10)" }}>
        <Zel mood={short ? "worried" : current === -1 ? "cheer" : "happy"} size={72} bob />
        <p className="text-[17px] font-bold leading-snug">
          {short ? `Your free cash (${naira(w.free_cash)}) is below one week of spending. Small steps first.`
            : current === -1 ? "Every step is done. Keep checking in." : `Next up: ${nodes[current].title}.`}
        </p>
      </section>

      <div className="relative mx-auto mt-6 w-80 pb-6" style={{ height: nodes.length * STEP }}>
        <svg aria-hidden className="absolute inset-0" width="320" height={nodes.length * STEP} viewBox={`0 0 320 ${nodes.length * STEP}`} fill="none">
          {nodes.slice(0, -1).map((n, i) => {
            const x1 = 160 + OFFSETS[i % OFFSETS.length], y1 = i * STEP + 40, x2 = 160 + OFFSETS[(i + 1) % OFFSETS.length], y2 = (i + 1) * STEP + 40, my = (y1 + y2) / 2;
            const d = `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
            return n.done
              ? <path key={n.id} d={d} pathLength={100} stroke="var(--indigo)" strokeWidth="4" strokeLinecap="round" className="thread" style={{ animationDelay: `${i * 160}ms` }} />
              : <path key={n.id} d={d} stroke="var(--line)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />;
          })}
        </svg>
        <ol>
          {nodes.map((n, i) => {
            const state = n.done ? "done" : i === current ? "current" : "locked";
            const look = state === "done" ? "bg-mint text-white" : state === "current" ? "bg-danfo text-ink" : "bg-line text-soft";
            return (
              <li key={n.id} className="absolute left-1/2 flex w-44 -translate-x-1/2 flex-col items-center text-center" style={{ top: i * STEP, marginLeft: OFFSETS[i % OFFSETS.length] }}>
                <button onClick={n.act} disabled={state === "locked"} aria-label={`${n.title}. ${state === "done" ? "Done" : state === "current" ? "Next step" : "Locked"}. ${n.hint}`}
                  className={`btn relative grid h-20 w-20 place-items-center rounded-full ${look} ${state === "current" ? "ring-[6px] ring-danfo/30" : ""} disabled:cursor-not-allowed`}>
                  {state === "done" ? <Check size={34} strokeWidth={3.5} /> : state === "locked" ? <Lock size={26} /> : <Plus size={34} strokeWidth={3} />}
                </button>
                <span className="mt-2 rounded-lg bg-chalk px-2 font-display text-lg font-bold leading-tight">{n.title}</span>
                {state !== "locked" && <span className="rounded-lg bg-chalk px-2 text-sm text-soft">{n.hint}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="pb-6 text-center text-sm text-soft">Your streak counts the days you open ZELTA. It never asks you to move money. <Link href="/twin" className="font-semibold text-indigo underline">See your Twin</Link></p>
      {add && <QuickAdd kind={add} onClose={() => setAdd(null)} onDone={wallet.reload} />}
    </main>
  );
}
