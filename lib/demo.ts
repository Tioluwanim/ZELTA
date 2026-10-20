// Sample data for DEMO mode only (NEXT_PUBLIC_DEMO=1). The UI labels it as sample data. Never used with a real backend.
import type { CopilotAnswer, Gig, ProfilePatch, SavingsSim, Stress, TxCategory, UserProfile, WalletSummary } from "./types";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString();
let profileState: UserProfile = {
  uid: "demo", email: "tola@example.com", name: "Tola", university: "OAU", department: "Computer Science", level: "300",
  financial: { fee_obligations: [{ label: "Department project levy", amount: 15000, due_date: iso(-7).slice(0, 10) }],
    income_sources: ["parent_transfer"], monthly_income: 45000, risk_tolerance: "low", capital_range: null },
  preferences: { currency: "NGN", primary_goal: "Build savings", plain_english_mode: true },
  notifications: { stress_alerts: true, weekly_bq_report: true, decision_reminders: true, frequency: "daily" },
};
let walletState: WalletSummary = {
  total_balance: 53500, free_cash: 31000, locked_amount: 8000, total_income: 45000, total_expenses: 15040,
  weekly_burn_rate: 15036,
  savings_goals: [{ id: "g1", label: "Laptop repair", amount: 8000, unlock_date: iso(-30), created_at: iso(10), is_active: true }],
  recent_transactions: [
    { id: "t1", type: "expense", amount: 1800, category: "food", description: "Lunch", date: iso(0), balance_after: 53500 },
    { id: "t2", type: "expense", amount: 2000, category: "data", description: "MTN data plan", date: iso(2), balance_after: 55300 },
    { id: "t3", type: "income", amount: 45000, category: "parent_transfer", description: "Allowance", date: iso(5), balance_after: 57300 },
  ],
  spending_heat: [{ category: "food", amount: 6800, percentage: 45, status: "amber" },
    { category: "transport", amount: 4200, percentage: 28, status: "green" },
    { category: "data", amount: 4040, percentage: 27, status: "green" }],
  bq_alerts: [],
};
const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 250));

export const profile = () => wait(profileState);
export const updateProfile = (p: ProfilePatch) => {
  profileState = { ...profileState, ...p, financial: { ...profileState.financial, ...p.financial },
    preferences: { ...profileState.preferences, ...p.preferences }, notifications: { ...profileState.notifications, ...p.notifications } } as UserProfile;
  return wait(profileState);
};
export const wallet = () => wait(walletState);
export const addTx = (type: "income" | "expense", amount: number, category: TxCategory) => {
  const sign = type === "income" ? 1 : -1;
  const bal = walletState.total_balance + sign * amount;
  walletState = { ...walletState, total_balance: bal, free_cash: walletState.free_cash + sign * amount,
    recent_transactions: [{ id: `t${Date.now()}`, type, amount, category, date: iso(0), balance_after: bal }, ...walletState.recent_transactions] };
  return wait({ success: true });
};
export const stress = (): Promise<Stress> => wait({ stress_index: 42, level: "MODERATE", label: "Sample reading" });
export const ask = (q: string): Promise<CopilotAnswer> => wait({
  answer: `Sample answer to: “${q}”. In demo mode ZELTA does not call a model, so connect the backend to get real answers.`,
  verdict: "HOLD", verdict_amount: 0, context_pills: [{ label: "Mode", value: "Sample data" }], confidence: 0, sources: [] });
export const gigs = (): Promise<Gig[]> => wait([
  { id: "x1", task: "Print and bind 20 project copies", location: "Campus gate", payout: 4000, payout_raw: "₦4,000", time_estimate: "2 hours", skills_required: [], status: "OPEN" },
  { id: "x2", task: "Design a flyer for a church event", location: "Remote", payout: 6000, payout_raw: "₦6,000", time_estimate: "1 day", skills_required: ["design"], status: "OPEN" }]);
export const simulateSavings = (weekly: number, target: number): Promise<SavingsSim> => wait({
  weeks_to_target: Math.ceil(target / weekly), weekly_surplus: weekly, projected_shortfall: 0, green_weeks: Math.ceil(target / weekly),
  amber_weeks: 0, red_weeks: 0, verdict: "SAVE", plain_english: "Sample projection only." });
export const lock = (amount: number, label: string, unlockDate: string) => {
  walletState = { ...walletState, free_cash: walletState.free_cash - amount, locked_amount: walletState.locked_amount + amount,
    savings_goals: [...walletState.savings_goals, { id: `g${Date.now()}`, label, amount, unlock_date: unlockDate, created_at: iso(0), is_active: true }] };
  return wait({ success: true });
};
