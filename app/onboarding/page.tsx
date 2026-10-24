"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Zel, { type Mood } from "@/components/Zel";
import { Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ProfilePatch } from "@/lib/types";

const SOURCES = [["parent_transfer", "Family support"], ["side_hustle", "Side hustle"], ["bursary", "Bursary or scholarship"], ["salary", "Salary"]] as const;
const GOALS = ["Build savings", "Generate income", "Grow wealth"] as const;
const RISK = [["low", "Careful", "I would rather lose nothing"], ["moderate", "Balanced", "Some ups and downs are fine"], ["high", "Bold", "I can handle losing money for a bigger win"]] as const;

export default function Onboarding() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [typed, setName] = useState<string | null>(null);
  const name = typed ?? user?.name ?? "";
  const [sources, setSources] = useState<string[]>([]);
  const [income, setIncome] = useState("");
  const [bill, setBill] = useState({ label: "", amount: "", due: "" });
  const [goal, setGoal] = useState<string>("");
  const [risk, setRisk] = useState<"low" | "moderate" | "high">("moderate");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (ready && !user) router.replace("/auth"); }, [ready, user, router]);

  const total = 6;
  const moods: Mood[] = ["happy", "think", "think", "think", "happy", "cheer"];
  const field = "w-full rounded-2xl border-2 border-line bg-paper px-4 min-h-12 text-[17px] focus:border-indigo outline-none";

  async function finish() {
    setBusy(true); setError(null);
    const patch: ProfilePatch = {
      name: name.trim() || undefined,
      financial: {
        income_sources: sources, risk_tolerance: risk,
        ...(income ? { monthly_income: Number(income) } : {}),
        ...(bill.label && Number(bill.amount) > 0 && bill.due ? { fee_obligations: [{ label: bill.label.trim(), amount: Number(bill.amount), due_date: bill.due }] } : {}),
      },
      preferences: { primary_goal: goal },
    };
    try { await api.updateProfile(patch); router.replace("/path"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save. Try again."); setBusy(false); }
  }

  const canNext = [name.trim().length > 0, true, true, true, goal !== "", true][step];
  const skippable = step === 1 || step === 2 || step === 3;
  const last = step === total - 1;
  const next = () => (last ? void finish() : setStep(step + 1));

  const body = [
    <label key="n" className="block font-semibold">What should Zel call you?<input className={`${field} mt-2`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /></label>,
    <fieldset key="s" className="space-y-3"><legend className="mb-1 font-semibold">Where does your money come from?</legend>
      {SOURCES.map(([v, l]) => { const on = sources.includes(v); return (
        <button key={v} type="button" aria-pressed={on} onClick={() => setSources(on ? sources.filter((x) => x !== v) : [...sources, v])}
          className={`min-h-14 w-full rounded-2xl border-2 px-4 text-left text-[17px] font-semibold ${on ? "border-indigo bg-indigo-tint" : "border-line bg-paper"}`}>{l}</button>); })}</fieldset>,
    <label key="i" className="block font-semibold">About how much comes in each month, in naira?
      <input className={`${field} mt-2`} inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value.replace(/\D/g, ""))} placeholder="45000" /></label>,
    <div key="b" className="space-y-3"><p className="font-semibold">Is a big bill coming up? Fees, rent or a levy.</p>
      <input className={field} placeholder="What is it for?" value={bill.label} onChange={(e) => setBill({ ...bill, label: e.target.value })} />
      <input className={field} inputMode="numeric" placeholder="Amount in naira" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value.replace(/\D/g, "") })} />
      <label className="block text-sm font-semibold text-soft">Due date<input type="date" className={`${field} mt-1`} value={bill.due} onChange={(e) => setBill({ ...bill, due: e.target.value })} /></label></div>,
    <fieldset key="g" className="space-y-3"><legend className="mb-1 font-semibold">What matters most right now?</legend>
      {GOALS.map((g) => <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(g)}
        className={`min-h-14 w-full rounded-2xl border-2 px-4 text-left text-[17px] font-semibold ${goal === g ? "border-indigo bg-indigo-tint" : "border-line bg-paper"}`}>{g}</button>)}</fieldset>,
    <fieldset key="r" className="space-y-3"><legend className="mb-1 font-semibold">How do you feel about risk?</legend>
      {RISK.map(([v, t, d]) => <button key={v} type="button" aria-pressed={risk === v} onClick={() => setRisk(v)}
        className={`min-h-14 w-full rounded-2xl border-2 px-4 py-2 text-left ${risk === v ? "border-indigo bg-indigo-tint" : "border-line bg-paper"}`}>
        <span className="block text-[17px] font-semibold">{t}</span><span className="text-soft">{d}</span></button>)}</fieldset>,
  ][step];

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <button aria-label="Leave setup" onClick={() => router.replace("/")} className="grid h-11 w-11 place-items-center rounded-xl text-soft hover:bg-line/50"><X /></button>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label="Setup progress" className="h-4 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-mint transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
      </header>
      <div className="flex justify-center"><Zel mood={error ? "worried" : moods[step]} size={110} bob /></div>
      <Card>{body}</Card>
      {error && <p role="alert" className="text-center font-semibold text-coral-deep">{error}</p>}
      <div className="grid gap-3">
        <Button variant={last ? "reward" : "primary"} disabled={!canNext || busy} onClick={next}>{busy ? "Saving…" : last ? "Start my path" : "Continue"}</Button>
        {skippable && <Button variant="quiet" onClick={next}>Skip for now</Button>}
        {step > 0 && <button className="min-h-11 font-semibold text-soft" onClick={() => setStep(step - 1)}>Back</button>}
      </div>
    </main>
  );
}
