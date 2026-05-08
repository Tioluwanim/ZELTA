"use client";
import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useWallet } from "@/hooks/zelta";
import { apiFetch } from "@/hooks/useFetch";
import {
  PlusCircle, MinusCircle, Lock, Wallet, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Eye, EyeOff, X, Loader2, CheckCircle,
} from "lucide-react";
import type { WalletSummary, SavingsGoal, Transaction, SpendingHeatItem } from "@/types/zelta";

type ModalType = "income" | "expense" | "goal" | null;

// ─── Modal Shell ──────────────────────────────────────────────────
function ModalShell({ title, icon, onClose, children }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">{icon}</div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:bg-gray-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Backend enum for the `source` field (shared by both income + expense endpoints)
const SOURCES = [
  { value: "side_hustle",      label: "Side Hustle" },
  { value: "parent_transfer",  label: "Parent Transfer" },
  { value: "bursary",          label: "Bursary" },
  { value: "savings",          label: "Savings" },
  { value: "investment",       label: "Investment" },
  { value: "other",            label: "Other" },
] as const;

const EXPENSE_SOURCES = [
  { value: "food",             label: "Food" },
  { value: "transport",        label: "Transport" },
  { value: "data",             label: "Data / Airtime" },
  { value: "education",        label: "Education" },
  { value: "entertainment",    label: "Entertainment" },
  { value: "utilities",        label: "Utilities" },
  { value: "other",            label: "Other" },
] as const;

// ─── Add Income Modal ─────────────────────────────────────────────
function AddIncomeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<string>("side_hustle");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/api/wallet/income", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          source,
          description: description.trim() || undefined,
        }),
      });
      onSuccess(); onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to add income.");
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title="Add Income" icon={<ArrowDownRight className="h-5 w-5 text-emerald-600" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Amount (₦)</label>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 20000"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-400">
            {SOURCES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Holiday job payment"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          {loading ? "Saving..." : "Add Income"}
        </button>
      </form>
    </ModalShell>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────
function AddExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/api/wallet/expense", {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), category, description: description || undefined }),
      });
      onSuccess(); onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to add expense.");
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title="Add Expense" icon={<MinusCircle className="h-5 w-5 text-rose-500" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Amount (₦)</label>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 3500"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-rose-400">
            {["food","transport","data","education","entertainment","utilities","other"].map((c) => (
              <option key={c} value={c}>{c.replace(/\b\w/g,(l)=>l.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Bought airtime"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-rose-400" />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />}
          {loading ? "Saving..." : "Add Expense"}
        </button>
      </form>
    </ModalShell>
  );
}

// ─── Lock Goal Modal ──────────────────────────────────────────────
function LockGoalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) { setError("Please enter a goal name."); return; }
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!unlockDate) { setError("Please select an unlock date."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/api/wallet/lock", {
        method: "POST",
        // Backend expects ISO datetime string for unlock_date
        body: JSON.stringify({ label: label.trim(), amount: Number(amount), unlock_date: new Date(unlockDate).toISOString(), description: description || undefined }),
      });
      onSuccess(); onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to create goal.");
    } finally { setLoading(false); }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <ModalShell title="Lock Savings Goal" icon={<Lock className="h-5 w-5 text-violet-600" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Goal Name</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Hostel Fee"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Target Amount (₦)</label>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 58500"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-violet-400" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Unlock Date</label>
          <input type="date" min={minDateStr} value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-violet-400" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 200 level hostel"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-violet-400" />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {loading ? "Locking..." : "Lock Goal"}
        </button>
      </form>
    </ModalShell>
  );
}

// ─── Action Cards Row (matches reference image) ───────────────────
function ActionCards({ onAction }: { onAction: (type: ModalType) => void }) {
  const cards = [
    { type: "income" as ModalType, label: "Add Income", icon: <ArrowDownRight className="h-6 w-6 text-emerald-600" />, iconBg: "bg-emerald-100", cardBg: "bg-emerald-50", border: "border-emerald-200" },
    { type: "expense" as ModalType, label: "Add Expense", icon: <MinusCircle className="h-6 w-6 text-rose-500" />, iconBg: "bg-rose-100", cardBg: "bg-rose-50", border: "border-rose-200" },
    { type: "goal" as ModalType, label: "Lock Goal", icon: <Lock className="h-6 w-6 text-violet-600" />, iconBg: "bg-violet-100", cardBg: "bg-violet-50", border: "border-violet-200" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <button key={card.type} onClick={() => onAction(card.type)}
          className={`flex flex-col items-center gap-2.5 rounded-2xl border ${card.border} ${card.cardBg} px-2 py-4 shadow-sm transition hover:scale-[1.03] hover:shadow-md active:scale-[0.97]`}>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg}`}>{card.icon}</div>
          <span className="text-xs font-semibold text-gray-700 text-center leading-snug">{card.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Balance Card ─────────────────────────────────────────────────
function BalanceCard({ wallet, visible }: { wallet: WalletSummary; visible: boolean }) {
  const fmt = (n: number) => visible ? `₦${n.toLocaleString()}` : "₦ ••••••";
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-100 uppercase tracking-widest">Total Balance</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{fmt(wallet.total_balance)}</h1>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
          <Wallet className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { label: "Free Cash", value: fmt(wallet.free_cash) },
          { label: "Locked", value: fmt(wallet.locked_amount) },
          { label: "Weekly Pace", value: fmt(wallet.weekly_burn_rate) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-white/15 p-3">
            <p className="text-[10px] font-medium text-emerald-100 uppercase tracking-wide">{label}</p>
            <p className="mt-0.5 text-sm font-bold truncate">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BQ Alerts ────────────────────────────────────────────────────
function BqAlerts({ alerts }: { alerts: string[] }) {
  if (!alerts?.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">{alert}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────
function SummaryRow({ wallet }: { wallet: WalletSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <p className="text-xs font-medium text-emerald-700">Total Income</p>
        </div>
        <p className="text-xl font-bold text-emerald-700">₦{wallet.total_income.toLocaleString()}</p>
      </div>
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpRight className="h-4 w-4 text-rose-500" />
          <p className="text-xs font-medium text-rose-600">Total Expenses</p>
        </div>
        <p className="text-xl font-bold text-rose-600">₦{wallet.total_expenses.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── Savings Goals ────────────────────────────────────────────────
function SavingsGoalsSection({ goals }: { goals: SavingsGoal[] }) {
  if (!goals?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-500">No locked goals yet</p>
        <p className="text-xs text-gray-400">Tap "Lock Goal" to start a target like rent, fees, or school needs.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        const daysLeft = Math.max(0, Math.ceil((new Date(goal.unlock_date).getTime() - Date.now()) / 86400000));
        return (
          <div key={goal.id} className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{goal.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {daysLeft > 0 ? `Unlocks in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : "Ready to unlock"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-600">₦{goal.amount.toLocaleString()}</p>
                {goal.is_active && <span className="text-[10px] font-bold text-orange-400 uppercase">Active</span>}
              </div>
            </div>
            {goal.description && <p className="mt-2 text-xs text-gray-500">{goal.description}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Spending Heat ────────────────────────────────────────────────
function SpendingHeat({ items }: { items: SpendingHeatItem[] }) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400">
        No spending data yet. Add your first expense to see where your money goes each week.
      </div>
    );
  }
  const statusCfg = {
    green: { label: "On Track", dot: "bg-emerald-500", text: "text-emerald-700", bar: "bg-emerald-500", wrapBg: "bg-emerald-50 border-emerald-100" },
    amber: { label: "Watch", dot: "bg-amber-500", text: "text-amber-700", bar: "bg-amber-500", wrapBg: "bg-amber-50 border-amber-100" },
    red: { label: "Over Budget", dot: "bg-red-500", text: "text-red-700", bar: "bg-red-500", wrapBg: "bg-red-50 border-red-100" },
  };
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const cfg = statusCfg[item.status] ?? statusCfg.green;
        return (
          <div key={i} className={`rounded-xl border px-4 py-3 ${cfg.wrapBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                <span className="text-sm font-medium text-gray-800">{item.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">₦{item.amount.toLocaleString()}</span>
                <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.text}`}>{cfg.label}</span>
              </div>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-white/60">
              <div className={`h-1 rounded-full ${cfg.bar}`} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
            </div>
            <p className="mt-1 text-right text-[10px] text-gray-400">{item.percentage.toFixed(0)}% of total spend</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recent Transactions ──────────────────────────────────────────
function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  if (!transactions?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400">
        No transactions yet. Start with "Add Income" or "Add Expense" to build your wallet history.
      </div>
    );
  }
  const typeCfg = {
    income: { icon: <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />, bg: "bg-emerald-100", amtColor: "text-emerald-600", sign: "+" },
    expense: { icon: <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />, bg: "bg-rose-100", amtColor: "text-gray-800", sign: "-" },
    lock: { icon: <Lock className="h-3.5 w-3.5 text-violet-600" />, bg: "bg-violet-100", amtColor: "text-violet-600", sign: "" },
    unlock: { icon: <CheckCircle className="h-3.5 w-3.5 text-blue-500" />, bg: "bg-blue-100", amtColor: "text-blue-600", sign: "+" },
  };
  return (
    <div className="space-y-2">
      {transactions.slice(0, 10).map((tx) => {
        const cfg = typeCfg[tx.type] ?? typeCfg.expense;
        const date = new Date(tx.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
        return (
          <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-50">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>{cfg.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{tx.description || tx.category}</p>
              <p className="text-xs text-gray-400">{date} · {tx.category}</p>
            </div>
            <p className={`shrink-0 text-sm font-bold ${cfg.amtColor}`}>{cfg.sign}₦{tx.amount.toLocaleString()}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Wallet Skeleton ──────────────────────────────────────────────
function WalletSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-40 rounded-2xl bg-gray-200" />
      <div className="grid grid-cols-3 gap-3">{[0,1,2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100" />)}</div>
      <div className="grid grid-cols-2 gap-3">{[0,1].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-100" />)}</div>
      <div className="h-32 rounded-2xl bg-gray-100" />
      <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100" />)}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function WalletPage() {
  const [visible, setVisible] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const wallet = useWallet();

  const handleModalSuccess = () => { wallet.refetch(); };

  return (
    <>
      {activeModal === "income" && <AddIncomeModal onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
      {activeModal === "expense" && <AddExpenseModal onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
      {activeModal === "goal" && <LockGoalModal onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}

      <div className="px-3 pb-10 lg:px-0">
        <PageHeader title="ZELTA Wallet" description="Unified view of your finances">
          <button onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide wallet amounts" : "Show wallet amounts"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50">
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </PageHeader>

        <div className="mt-5 space-y-6">
          {wallet.loading && <WalletSkeleton />}

          {wallet.error && !wallet.data && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-5">
              <p className="font-semibold text-red-700">Failed to load wallet</p>
              <p className="mt-1 text-xs text-red-500">{wallet.error}</p>
              <button onClick={() => wallet.refetch()}
                className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200">
                Retry
              </button>
            </div>
          )}

          {!wallet.loading && wallet.data && (
            <>
              {wallet.data.bq_alerts?.length > 0 && <BqAlerts alerts={wallet.data.bq_alerts} />}

              <BalanceCard wallet={wallet.data} visible={visible} />
              <p className="text-xs text-gray-500 -mt-3">
                Weekly Spending Pace shows how fast money is leaving your wallet this week.
              </p>

              {/* ── Reference image: 3-card horizontal action row ── */}
              <ActionCards onAction={setActiveModal} />

              <SummaryRow wallet={wallet.data} />

              <div>
                <div className="mb-3">
                  <h2 className="font-bold text-gray-900">Locked Savings Goals</h2>
                  <p className="text-xs text-gray-500">{wallet.data.savings_goals?.length ?? 0} active goal{wallet.data.savings_goals?.length !== 1 ? "s" : ""}</p>
                </div>
                <SavingsGoalsSection goals={wallet.data.savings_goals ?? []} />
              </div>

              <div>
                <div className="mb-3">
                  <h2 className="font-bold text-gray-900">Spending by Category</h2>
                  <p className="text-xs text-gray-500">Simple view of where your money goes most</p>
                </div>
                <SpendingHeat items={wallet.data.spending_heat ?? []} />
              </div>

              <div>
                <div className="mb-3">
                  <h2 className="font-bold text-gray-900">Recent Transactions</h2>
                  <p className="text-xs text-gray-500">Latest wallet activity</p>
                </div>
                <RecentTransactions transactions={wallet.data.recent_transactions ?? []} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}