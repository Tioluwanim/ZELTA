"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Zel from "./Zel";
import { Button } from "./ui";
import { api } from "@/lib/api";
import { titleCase } from "@/lib/format";
import type { TxCategory } from "@/lib/types";

export type AddKind = "income" | "expense" | "goal";
const INCOME: TxCategory[] = ["parent_transfer", "side_hustle", "bursary", "other"];
const EXPENSE: TxCategory[] = ["food", "transport", "data", "education", "utilities", "entertainment", "other"];

export default function QuickAdd({ kind, onClose, onDone }: { kind: AddKind; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(""); const [cat, setCat] = useState<TxCategory>(kind === "income" ? "parent_transfer" : "food");
  const [label, setLabel] = useState(""); const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const n = Number(amount);
  const valid = n > 0 && (kind !== "goal" || (label.trim() && date));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (kind === "income") await api.addIncome(n, cat); else if (kind === "expense") await api.addExpense(n, cat);
      else await api.lockSavings(n, label.trim(), new Date(date).toISOString());
      setDone(true); onDone(); setTimeout(onClose, 1100);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save. Try again."); setBusy(false); }
  }
  const title = { income: "Log money in", expense: "Log money out", goal: "Set money aside" }[kind];
  const field = "w-full rounded-2xl border-2 border-line bg-paper px-4 min-h-12 text-[17px] focus:border-indigo outline-none";
  return (
    <div className="fixed inset-0 z-50 grid items-end bg-ink/40 md:place-items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="pop mx-auto w-full max-w-md rounded-t-3xl bg-paper p-5 md:rounded-3xl">
        {done ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center"><Zel mood="cheer" size={110} /><p className="font-display text-2xl font-bold">{kind === "goal" ? "Set aside" : "Logged"}</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">{title}</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-soft hover:bg-line/50"><X /></button></div>
            <label className="block font-semibold">Amount in naira<input ref={first} className={`${field} mt-1`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></label>
            {kind === "goal" ? <>
              <label className="block font-semibold">What is it for?<input className={`${field} mt-1`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} /></label>
              <label className="block font-semibold">Keep it locked until<input type="date" className={`${field} mt-1`} value={date} onChange={(e) => setDate(e.target.value)} /></label></>
              : <label className="block font-semibold">{kind === "income" ? "Source" : "Category"}
                <select className={`${field} mt-1`} value={cat} onChange={(e) => setCat(e.target.value as TxCategory)}>{(kind === "income" ? INCOME : EXPENSE).map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select></label>}
            {error && <p role="alert" className="font-semibold text-coral-deep">{error}</p>}
            <Button type="submit" variant="reward" className="w-full" disabled={!valid || busy}>{busy ? "Saving…" : kind === "goal" ? "Lock it" : "Save"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
