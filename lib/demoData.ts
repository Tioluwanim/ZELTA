/**
 * ZELTA Demo Seed Data
 * ─────────────────────────────────────────────────────────────────
 * Realistic Nigerian student data for the demo account.
 * Satisfies all concept note features without requiring live
 * Mono/Squad integration for the competition prototype.
 */

import type {
  WalletSummary,
  Transaction,
  SpendingHeatItem,
  GigSuggestion,
} from "@/types/zelta";

// ── Simulated linked bank (Mono-style) ────────────────────────────

export const DEMO_BANK = {
  bank_name: "OPay",
  account_number: "••••7842",
  account_name: "DEMO STUDENT",
  balance: 45000,
  connected_via: "Mono Open Banking",
  last_synced: new Date().toISOString(),
};

// ── Demo transactions ─────────────────────────────────────────────

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-001",
    type: "income",
    amount: 45000,
    category: "parent_transfer",
    description: "Monthly allowance from home",
    date: new Date(Date.now() - 2 * 864e5).toISOString(),
    balance_after: 45000,
  },
  {
    id: "tx-002",
    type: "expense",
    amount: 3500,
    category: "food",
    description: "Bukka lunch + dinner",
    date: new Date(Date.now() - 2 * 864e5).toISOString(),
    balance_after: 41500,
  },
  {
    id: "tx-003",
    type: "lock",
    amount: 18500,
    category: "savings",
    description: "🔒 Hostel fee — locked until semester end",
    date: new Date(Date.now() - 1 * 864e5).toISOString(),
    balance_after: 23000,
  },
  {
    id: "tx-004",
    type: "expense",
    amount: 2000,
    category: "transport",
    description: "Tricycle to campus + town",
    date: new Date(Date.now() - 1 * 864e5).toISOString(),
    balance_after: 21000,
  },
  {
    id: "tx-005",
    type: "expense",
    amount: 1500,
    category: "education",
    description: "Department handout printing",
    date: new Date(Date.now() - 18 * 3600e3).toISOString(),
    balance_after: 19500,
  },
  {
    id: "tx-006",
    type: "expense",
    amount: 3000,
    category: "entertainment",
    description: "Friday outing — FOMO spending ⚠️",
    date: new Date(Date.now() - 12 * 3600e3).toISOString(),
    balance_after: 16500,
  },
  {
    id: "tx-007",
    type: "income",
    amount: 10000,
    category: "side_hustle",
    description: "Side hustle — lecture note typist",
    date: new Date(Date.now() - 6 * 3600e3).toISOString(),
    balance_after: 26500,
  },
];

// ── Spending heat ─────────────────────────────────────────────────

export const DEMO_SPENDING_HEAT: SpendingHeatItem[] = [
  { category: "food", amount: 12500, percentage: 32, status: "amber" },
  { category: "transport", amount: 6000, percentage: 15, status: "green" },
  { category: "entertainment", amount: 8000, percentage: 21, status: "red" },
  { category: "education", amount: 4500, percentage: 12, status: "green" },
  { category: "other", amount: 7500, percentage: 20, status: "amber" },
];

// ── Wallet summary ────────────────────────────────────────────────

export const DEMO_WALLET: WalletSummary = {
  total_balance: 45000,
  free_cash: 26500,
  locked_amount: 18500,
  locked_total: 18500,
  total_income: 55000,
  total_expenses: 28500,
  weekly_burn_rate: 7200,
  savings_goals: [
    {
      id: "goal-001",
      label: "Hostel Fee (2nd Semester)",
      amount: 18500,
      unlock_date: new Date(Date.now() + 45 * 864e5).toISOString(),
      description: "Locked via ZELTA guardrail",
      created_at: new Date(Date.now() - 864e5).toISOString(),
      is_active: true,
    },
    {
      id: "goal-002",
      label: "Departmental Levy",
      amount: 5000,
      unlock_date: new Date(Date.now() + 14 * 864e5).toISOString(),
      description: "Due before exams — 2 weeks",
      created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
      is_active: true,
    },
  ],
  recent_transactions: DEMO_TRANSACTIONS,
  spending_heat: DEMO_SPENDING_HEAT,
  bq_alerts: [
    "Your entertainment spending is 21% of total — above the safe 15% threshold.",
    "Exams in 14 days. ZELTA recommends reducing discretionary spending now.",
  ],
};

// ── Layer 4 — Gig Connection recovery suggestions ─────────────────

export const DEMO_GIGS: GigSuggestion[] = [
  {
    task: "Lecture note typist",
    payout: 5000,
    hours: 3,
    worth_score: 88,
    location: "Engineering Library",
    source: "Campus Board",
  },
  {
    task: "Debug Python assignment",
    payout: 8000,
    hours: 4,
    worth_score: 82,
    location: "Computer Lab",
    source: "Campus Board",
  },
  {
    task: "Design WhatsApp flyers",
    payout: 4000,
    hours: 2,
    worth_score: 79,
    location: "Remote / Online",
    source: "Campus Board",
  },
  {
    task: "Help move items to New Hostel",
    payout: 3500,
    hours: 1,
    worth_score: 75,
    location: "SUB",
    source: "Campus Board",
  },
  {
    task: "Proofread final year project",
    payout: 6000,
    hours: 3,
    worth_score: 72,
    location: "Remote",
    source: "Campus Board",
  },
];

// ── Full intercept scenario ────────────────────────────────────────
// Fires when judge clicks "Simulate Risky Transfer" on dashboard

export const DEMO_INTERCEPT = {
  amount: 15000,
  category: "entertainment",
  description: "Transfer to friend for trip to Ibadan",
  intentType: "IMPULSE" as const,
  freeCash: 26500,
  weeksRunway: 3.7,
  daysToExam: 14,
  lambdaT: 0.88,
  stressScore: 72,
  stressLevel: "HIGH_STRESS",
  marketTitle: "Nigerian Naira Stability Market",
  agentMode: "SURVIVAL" as const,
  bqAlert:
    "Chief, this breaks your runway. You have exams in 14 days and ₦5,000 departmental levy due. Spending ₦15,000 on entertainment now leaves you with just 9 days of cash — you will hit zero before your next allowance.",
  safeAmount: 4000,
  biasDetected: "FOMO_BUYING",
  gigSuggestions: DEMO_GIGS,
};

// ── BQ intelligence for dashboard ────────────────────────────────

export const DEMO_INTELLIGENCE = {
  stress_index: 72,
  stress_level: "HIGH_STRESS" as const,
  stress_label: "High Market Stress",
  bayse_market: "Nigerian Naira Stability Market",
  active_bias: "FOMO_BUYING",
  bias_explanation:
    "Your last 3 transactions match FOMO Buying — high velocity entertainment spend when institutional bills are due.",
  decision_verdict: "HOLD" as const,
  student_verdict: "PROTECT",
  decision_plain:
    "Market crowd panic is at 72/100. ZELTA says: Hold. Do not make large financial moves today.",
  invest_ngn: 4000,
  save_ngn: 15000,
  hold_ngn: 7500,
  spend_safely_ngn: 4000,
  protect_ngn: 15000,
  buffer_ngn: 7500,
  allocation_pct: 0.25,
  allocation_plain:
    "Of your ₦26,500 free cash — keep ₦4,000 for safe daily spend, lock ₦15,000 toward fees, hold ₦7,500 in reserve.",
  rational_pct: 38,
  behavioral_pct: 62,
  confidence_gap: 24,
  confidence_score: 61,
  confidence_tier: "Medium" as const,
  confidence_plain:
    "62% of recent decisions show behavioural bias. Your math says save — your behaviour says spend.",
  is_actionable: true,
  intervention_urgency: "HIGH" as const,
  bq_alert: "⚠️ FOMO Spending detected. Market stress is HIGH. Exams in 14 days.",
  summary:
    "You are in SURVIVAL mode — survival score 61/100. Your money lasts 3.7 weeks at current pace.",
  action: "ZELTA says HOLD. Safe to use: ₦4,000 this week. Lock the rest.",
  crowd_yes: 0.72,
  crowd_no: 0.28,
  bayse_primary: 0.72,
  nlp_secondary: 0.28,
  market_probability: 0.72,
  bayse_score: 72,
  bayse_status: "HIGH_STRESS" as const,
  edge: 0.44,
  win_probability: 0.38,
  score_label: "MODERATE" as const,
  score_rating: "Fair" as const,
  decision_score: 61,
  nlp_sentiment: -0.3,
  headlines: [],
  student_model: {
    agent_mode: "SURVIVAL" as const,
    survival_score: 61,
    free_cash: 26500,
    weeks_of_runway: 3.7,
    weeks_to_fee_deadline: 2,
    fee_amount_due: 5000,
    fee_gap_ngn: 5000,
    weekly_burn_rate: 7200,
    safe_discretionary_ngn: 4000,
    survival_mode: true,
    emergency_mode: false,
    status_message: "⚠️ Departmental levy due in 2 weeks. Spending pace is unsafe.",
    behavioral: {
      stress_level: "HIGH" as const,
      primary_directive: "Reduce discretionary spending immediately.",
    },
    risk_tolerance: "low",
  },
};