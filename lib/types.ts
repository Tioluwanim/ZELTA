// Mirrors zelta_backend/schemas (wallet, profile, copilot, gig, simulation). Amounts are naira as the backend sends them.
export type TxType = "income" | "expense" | "lock" | "unlock";
export interface Transaction {
  id: string; type: TxType; amount: number; category: string; description?: string | null; date: string; balance_after: number;
}
export interface SavingsGoal {
  id: string; label: string; amount: number; unlock_date: string; description?: string | null; created_at: string; is_active: boolean;
}
export interface SpendingHeat { category: string; amount: number; percentage: number; status: "green" | "amber" | "red" }
export interface WalletSummary {
  total_balance: number; free_cash: number; locked_amount: number; total_income: number; total_expenses: number;
  weekly_burn_rate: number; savings_goals: SavingsGoal[]; recent_transactions: Transaction[];
  spending_heat: SpendingHeat[]; bq_alerts: string[];
}
export interface FeeObligation { label: string; amount: number; due_date: string }
export interface UserProfile {
  uid: string; email: string; name: string; picture?: string | null;
  university?: string | null; department?: string | null; level?: string | null;
  financial: {
    monthly_budget?: number | null; fee_obligations: FeeObligation[]; income_sources: string[];
    monthly_income?: number | null; risk_tolerance: "low" | "moderate" | "high"; capital_range?: string | null;
  };
  preferences: { currency: string; primary_goal?: string | null; plain_english_mode: boolean };
  notifications: { stress_alerts: boolean; weekly_bq_report: boolean; decision_reminders: boolean; frequency: string };
}
export type ProfilePatch = Partial<Pick<UserProfile, "name" | "university" | "department" | "level">> & {
  financial?: Partial<UserProfile["financial"]>;
  preferences?: Partial<UserProfile["preferences"]>;
  notifications?: Partial<UserProfile["notifications"]>;
};
export interface CopilotMessage { role: "user" | "assistant"; content: string }
export interface CopilotAnswer {
  answer: string; verdict: string; verdict_amount: number; context_pills: { label: string; value: string }[];
  confidence: number; sources: string[];
}
export interface Gig {
  id: string; task: string; location: string; payout: number; payout_raw: string; time_estimate?: string | null;
  skills_required: string[]; status: string; poster?: string | null;
}
export interface Stress { stress_index: number; level: string; label: string }
export interface SavingsSim {
  weeks_to_target: number; weekly_surplus: number; projected_shortfall: number; green_weeks: number;
  amber_weeks: number; red_weeks: number; verdict: string; plain_english: string;
}
export type TxCategory = "food" | "transport" | "data" | "education" | "side_hustle" | "parent_transfer" | "bursary" | "savings" | "entertainment" | "utilities" | "other";
