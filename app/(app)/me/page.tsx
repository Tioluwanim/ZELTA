"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useProfile } from "@/components/ProfileContext";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { naira, shortDate } from "@/lib/format";
import type { ProfilePatch } from "@/lib/types";

export default function MePage() {
  const { profile, refresh } = useProfile();
  const { logout } = useAuth();
  const router = useRouter();
  const [bill, setBill] = useState({ label: "", amount: "", due: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (location.hash === "#bills") document.getElementById("bills")?.scrollIntoView(); }, []);
  const field = "w-full rounded-2xl border-2 border-line bg-paper px-4 min-h-12 text-[17px] focus:border-indigo outline-none";

  async function save(p: ProfilePatch) {
    setBusy(true); setErr(null);
    try { await api.updateProfile(p); refresh(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  }
  const bills = profile.financial.fee_obligations;
  const N = profile.notifications;
  const toggles: [keyof typeof N, string][] = [["stress_alerts", "Alert me when markets look stressed"], ["weekly_bq_report", "Weekly summary"], ["decision_reminders", "Reminders about decisions"]];

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-5">
      <h1 className="text-3xl font-bold">Me</h1>
      <Card><p className="text-xl font-semibold">{profile.name}</p><p className="text-soft">{profile.email}</p>
        <p className="mt-2">Goal: <strong>{profile.preferences.primary_goal ?? "Not set"}</strong> · Risk: <strong>{profile.financial.risk_tolerance}</strong>{profile.financial.monthly_income ? <> · Monthly income: <strong>{naira(profile.financial.monthly_income)}</strong></> : null}</p></Card>

      <Card id="bills" className="scroll-mt-4 space-y-3"><h2 className="text-xl font-semibold">Upcoming bills</h2>
        {bills.length === 0 ? <p className="text-soft">No bills yet. Add one so Zel can plan around it.</p> : (
          <ul className="divide-y-2 divide-line">{bills.map((b, i) => <li key={`${b.label}${i}`} className="flex items-center justify-between py-3">
            <div><p className="font-semibold">{b.label}</p><p className="text-sm text-soft">Due {shortDate(b.due_date)}</p></div>
            <div className="flex items-center gap-2"><span className="num text-lg font-bold">{naira(b.amount)}</span>
              <button aria-label={`Remove ${b.label}`} disabled={busy} onClick={() => void save({ financial: { fee_obligations: bills.filter((_, j) => j !== i) } })} className="grid h-11 w-11 place-items-center rounded-xl text-coral-deep hover:bg-coral-tint"><Trash2 size={20} /></button></div></li>)}</ul>)}
        <form className="grid gap-2 md:grid-cols-[1fr_9rem_10rem_auto]" onSubmit={(e) => { e.preventDefault(); void save({ financial: { fee_obligations: [...bills, { label: bill.label.trim(), amount: Number(bill.amount), due_date: bill.due }] } }).then(() => setBill({ label: "", amount: "", due: "" })); }}>
          <input aria-label="Bill name" className={field} placeholder="What is it for?" value={bill.label} onChange={(e) => setBill({ ...bill, label: e.target.value })} />
          <input aria-label="Amount in naira" className={field} inputMode="numeric" placeholder="Amount" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value.replace(/\D/g, "") })} />
          <input aria-label="Due date" type="date" className={field} value={bill.due} onChange={(e) => setBill({ ...bill, due: e.target.value })} />
          <Button type="submit" disabled={busy || !bill.label.trim() || !(Number(bill.amount) > 0) || !bill.due}>Add</Button></form>
        {err && <p role="alert" className="font-semibold text-coral-deep">{err}</p>}
      </Card>

      <Card className="space-y-2"><h2 className="text-xl font-semibold">Notifications</h2>
        {toggles.map(([k, l]) => <label key={k} className="flex min-h-12 items-center justify-between gap-3 font-semibold">{l}
          <input type="checkbox" className="h-6 w-6 accent-[var(--indigo)]" checked={Boolean(N[k])} disabled={busy} onChange={(e) => void save({ notifications: { [k]: e.target.checked } })} /></label>)}
      </Card>

      <Button variant="quiet" className="w-full" onClick={async () => { await logout(); router.replace("/"); }}><LogOut size={20} />Sign out</Button>
    </main>
  );
}
