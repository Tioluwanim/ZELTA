// Sample data for DEMO mode only (NEXT_PUBLIC_DEMO=1). The UI labels it as sample data. Never used with a real backend.
import type { AgentReply, CopilotAnswer, Guardian, Twin, WhatIfResult, Gig, ProfilePatch, SavingsSim, Stress, TxCategory, UserProfile, WalletSummary } from "./types";

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

// ---- Twin samples: clearly sample numbers, same shape as the real engine output. ----
const m = (naira: number) => ({ minor: naira * 100, currency: "NGN", display: `${naira.toLocaleString("en-NG")}.00 NGN` });
const dayStr = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);
const SERIES = [1800, 0, 2400, 0, 600, 3100, 0, 900, 0, 2000, 1500, 0, 0, 4200, 800, 0, 1200, 2600, 0, 500, 0, 1800, 3500, 0, 700, 0, 1900, 1800];
export const twin = (): Promise<Twin> => wait({
  as_of: new Date().toISOString(), source: "self_reported",
  summary: { total_connected_money: m(53500), burn_per_day: m(2148), runway_days: 17, warnings: ["Sample data. Not a live bank connection."] },
  runway: { runway_days: 17, assumptions: ["no new income counted"] },
  cushion: { required_cushion: m(10000), covered: true, runway_to_cushion_days: 14 },
  position: { total_connected_money: m(53500), outflow_28d: m(60144), bills_due_in_horizon: m(15000), available_after_bills: m(38500), cushion: m(10000),
    safe_flexible: m(8000), horizon_days: 30, notes: [], daily_spend_28d: SERIES.map((v, i) => ({ date: dayStr(28 - i), minor: v * 100 })) },
  buffer: { status: "healthy", minimum_safe: m(4807), cushion: m(10000), buffer_after_bills: m(38500), flexible_room: m(8000), notes: [] },
  forecast: { available: true, horizon_days: 30, expected_balance: { "7": m(36464), "14": m(6428), "30": m(-29140) },
    likely_runout_date: dayStr(-17), runout_range: [dayStr(-16), dayStr(-18)], upcoming_expenses: [{ name: "Department project levy", amount: m(15000), due: dayStr(-7) }],
    first_below_minimum_safe: dayStr(-15), notes: [] },
  habits: { covered_days: 28, category_share_pct: { food: 45, transport: 28, data: 27 }, focus_weekly_spend: { food: m(6800), transport: m(4200), data: m(4040) },
    spending_change: "steady", spending_change_pct: 0, not_enough_data_for: ["income timing: need 3+ income events across 2+ months"] },
  recommendations: { recommendations: [{ kind: "reduce_spending", priority: 2, title: "Spend ₦1,500 less each week on non-essentials", amount: m(1500),
    because: ["your money lasts about 17 days at the current pace"], effect: "about 2 more days of runway", confidence: "high" }], withheld: [] },
});
export const guardian = (amount: number): Promise<Guardian> => wait(amount >= 20000
  ? { state: "PROTECT", headline: "This would leave you short before your next income. Hold off.", verified: true, max_proceed_amount: m(8000),
      factors: [{ name: "forecast", state: "PROTECT", detail: "This pushes you below the minimum safe amount in about 15 days." },
        { name: "obligations", state: "CAUTION", detail: "₦15,000 is due in 7 days." }] }
  : amount >= 8000
    ? { state: "CAUTION", headline: "You can, but it eats into your buffer.", verified: true, max_proceed_amount: m(8000),
        factors: [{ name: "obligations", state: "CAUTION", detail: "₦15,000 is due in 7 days." }] }
    : { state: "PROCEED", headline: "Fine to go ahead. This is within your safe spending.", verified: true, max_proceed_amount: m(8000),
        factors: [{ name: "affordability", state: "PROCEED", detail: "Within your flexible room." }] });
export const whatif = (_k: string, a: number): Promise<WhatIfResult> => wait({ feasible: true, simulated: true,
  outcomes: [{ scenario: `spend ₦${a.toLocaleString("en-NG")} less each week`, runway_before_days: 17, runway_after_days: 20, runout_before: dayStr(-17), runout_after: dayStr(-20), notes: [] }] });
export const agent = (q: string): Promise<AgentReply> => wait({
  text: `Sample answer to “${q}”. At the sample pace your money lasts about 17 days. This is demo data, so connect the backend for your real numbers.`,
  intents: ["runway"], suggestions: ["What if I spend less each week?", "Can I afford ₦5,000?"], warnings: ["Sample data"], used_llm: false, needs_user_input: null,
  tools: [{ tool: "estimate_runway", ok: true }] });
