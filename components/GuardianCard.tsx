"use client";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Button, Card } from "./ui";
import { api } from "@/lib/api";
import { kobo, titleCase } from "@/lib/format";
import type { Guardian, GuardState } from "@/lib/types";

const LOOK: Record<GuardState, { word: string; Icon: typeof ShieldCheck; box: string }> = {
  PROCEED: { word: "Go ahead", Icon: ShieldCheck, box: "bg-mint-tint text-mint-deep" },
  CAUTION: { word: "Careful", Icon: ShieldAlert, box: "bg-danfo-tint text-ink" },
  PROTECT: { word: "Hold off", Icon: ShieldX, box: "bg-coral-tint text-coral-deep" },
};

/** "Before you spend": asks the Guardian about one amount. The answer comes from the engine; nothing here decides. */
export default function GuardianCard() {
  const [amount, setAmount] = useState(""); const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Guardian | null>(null); const [err, setErr] = useState("");
  async function check(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) { setErr("Enter an amount in naira."); return; }
    setBusy(true); setErr("");
    try { setRes(await api.guardian(n)); } catch (x) { setRes(null); setErr(x instanceof Error ? x.message : "Could not check that."); } finally { setBusy(false); }
  }
  const look = res ? LOOK[res.state] : null;
  return (
    <Card>
      <h2 className="text-xl font-bold">Before you spend</h2>
      <p className="text-soft">Type an amount. Zel checks it against your bills, buffer and forecast.</p>
      <form onSubmit={check} className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="g-amt">Amount in naira</label>
        <span className="flex min-h-12 flex-1 items-center rounded-[14px] border-[1.5px] border-line bg-chalk px-3 focus-within:border-indigo">
          <span className="num mr-1 text-soft">₦</span>
          <input id="g-amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5,000" className="num w-full bg-transparent text-lg outline-none" />
        </span>
        <Button type="submit" disabled={busy || !amount.trim()}>{busy ? "Checking" : "Check"}</Button>
      </form>
      {err && <p role="alert" className="mt-2 font-semibold text-coral-deep">{err}</p>}
      {res && look && (
        <div className="pop mt-4 space-y-3" role="status">
          <div className={`flex items-start gap-3 rounded-2xl p-4 ${look.box}`}>
            <look.Icon size={28} aria-hidden className="mt-0.5 shrink-0" />
            <div><p className="font-display text-xl font-bold">{look.word}</p><p className="text-[17px]">{res.headline}</p>
              {res.max_proceed_amount && res.state !== "PROCEED" && (res.max_proceed_amount.minor > 0
                ? <p className="mt-1 text-sm">Safe up to about <strong className="num">{kobo(res.max_proceed_amount)}</strong>.</p>
                : <p className="mt-1 text-sm">Right now nothing is safe to spend beyond your bills and cushion.</p>)}
              {!res.verified && <p className="mt-1 text-sm">Some of your data is missing, so this is a cautious answer.</p>}</div>
          </div>
          <ul className="space-y-1.5">{res.factors.map((f) => (
            <li key={f.name} className="flex gap-2 text-[15px]"><span className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.state === "PROCEED" ? "var(--mint)" : f.state === "CAUTION" ? "var(--danfo)" : "var(--coral)" }} aria-hidden />
              <span><strong>{titleCase(f.name)}:</strong> {f.detail}</span></li>))}</ul>
        </div>
      )}
    </Card>
  );
}
