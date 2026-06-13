// ─────────────────────────────────────────────────────────────────
//  ZELTA TYPE DEFINITIONS — ground-truth from zelta_backend schemas
//  Last synced: 2026-05 against zelta_backend/schemas/*.py
// ─────────────────────────────────────────────────────────────────

// ─── Shared enums ─────────────────────────────────────────────────
export type Verdict       = "SAVE" | "INVEST" | "HOLD";
/** Backend common.py StressLevel enum */
export type StressLevel   = "CALM" | "MODERATE" | "HIGH_STRESS" | "CRISIS";
export type ConfidenceTier = "Low" | "Medium" | "High";
export type ScoreLabel    = "WEAK" | "MODERATE" | "STRONG";
export type ScoreRating   = "Poor" | "Fair" | "Good" | "Excellent";
export type Urgency       = "LOW" | "MODERATE" | "HIGH";
export type BiasType      =
  | "Rational" | "Loss Aversion" | "Overconfidence"
  | "Anchoring" | "LOSS_AVERSION" | "PRESENT_BIAS"
  | "OVERCONFIDENCE" | "HERD_BEHAVIOR" | "MENTAL_ACCOUNTING" | "NONE";

// ─── /api/brain (IntelligenceResponse.data = BrainResponse) ──────
// Matches intelligence.py BrainResponse schema exactly
export interface BrainData {
  bayse: {
    score: number;                  // 0-100
    status: StressLevel;
    market_title: string;
    market_id: string;
    crowd_yes_price: number;        // 0-1 decimal
    crowd_no_price: number;         // 0-1 decimal
    mid_price: number;              // 0-1 decimal
    best_bid: number;
    best_ask: number;
    spread: number;
    imbalance: number;
    volume24h: number;
    trade_count_24h: number;
    available: boolean;
    raw_crowd_stress: number;       // 0-100 (BayseSchema field)
    naira_weakness_probability: number;
    outcome: string | null;
    last_price: number;
    source: string;
    updated_at: string | null;
  };
  nlp: {
    scored_headlines: {
      source: string; title: string; url: string; timestamp: string;
      sentiment: number; confidence: number;
      sentiment_label: "positive" | "negative" | "neutral";
      is_campus_relevant: boolean; weight: number;
    }[];
    aggregate_sentiment: number;
  };
  stress: {
    combined_index: number;         // 0-100
    level: StressLevel;
    label: string;
    bayse_primary: number;          // 0-1 decimal
    nlp_secondary: number;          // 0-1 decimal
    market_probability: number;     // 0-1 decimal
    bayse_weight: number;
    nlp_weight: number;
    plain_english: string;
    score: number;                  // computed alias for combined_index
    stress_score: number;           // computed alias for combined_index
  };
  bias: {
    active_bias: string;
    confidence: ConfidenceTier;
    explanation: string;
    inputs: Record<string, unknown>;
    bias: string | null;
  };
  decision: {
    verdict: Verdict;
    market_probability: number;     // 0-1 decimal
    rational_probability: number;   // 0-1 decimal
    edge: number;
    confidence: ConfidenceTier;
    win_probability: number;        // 0-1 decimal
    bias_applied: string;
    plain_english: string;
  };
  confidence: {
    rational_pct: number;           // 0-100 float
    behavioral_pct: number;         // 0-100 float
    gap: number;                    // 0-100 float (confidence gap)
    confidence_score: number;       // 0-100
    confidence_tier: ConfidenceTier;
    score_label: ScoreLabel;
    intervention_urgency: Urgency;
    is_actionable: boolean;
    plain_english: string;
    metrics: { edge_contribution: number; stress_penalty: number; conviction_contribution: number; };
    confidence_score_100: number;   // computed alias
    confidence_label: string;       // computed alias
  };
  allocation: {
    verdict: Verdict;
    student_verdict: "SPEND_SAFELY" | "PROTECT" | "HOLD" | string; // student-friendly alias
    invest_ngn: number;
    save_ngn: number;
    hold_ngn: number;
    spend_safely_ngn: number;   // student alias for invest_ngn
    protect_ngn: number;        // student alias for save_ngn
    buffer_ngn: number;         // student alias for hold_ngn
    allocation_pct: number;
    allocator_notes: string;
    plain_english: string;
    invest_amount: number;      // computed alias
    save_amount: number;        // computed alias
    hold_amount: number;        // computed alias
  };
  // student_model — survival intelligence from ZeltaStudentModel
  student_model: {
    agent_mode: "EMERGENCY" | "SURVIVAL" | "NORMAL";
    survival_score: number;       // 0-100
    free_cash: number;
    weeks_of_runway: number;
    weeks_to_fee_deadline: number;
    fee_amount_due: number;
    fee_gap_ngn: number;
    weekly_burn_rate: number;
    safe_discretionary_ngn: number;
    survival_mode: boolean;
    emergency_mode: boolean;
    status_message: string;
    behavioral: {
      stress_level: "CRITICAL" | "HIGH" | "STABLE";
      primary_directive: string;
    };
    risk_tolerance: string;
  } | null;
  // Tool outputs from agent loop
  hustle_recommendations: string | null;
  purchase_safety_check: string | null;
  score: {
    score: number;
    decision_score: number;
    rating: ScoreRating;
    components: { edge_score: number; confidence_score: number; verdict_score: number; };
  };
  explanation: {
    summary: string;
    reasoning: string;
    action: string;
    what_this_means_for_you: string | null;
    bias_explanation: string | null;
    confidence_note: string | null;
    bq_alert: string | null;
    context_summary: string | null;
  };
}

// ─── /api/intelligence (flat projection from intelligence.py route) ───
// The route manually projects BrainResponse fields into this flat dict
export interface IntelligenceData {
  // Stress (from brain.stress)
  stress_index: number;             // combined_index — 0-100
  stress_level: StressLevel;
  stress_label: string;
  bayse_primary: number;            // 0-1 decimal
  nlp_secondary: number;            // 0-1 decimal
  market_probability: number;       // 0-1 decimal
  // Bayse market
  bayse_score: number;              // 0-100
  bayse_status: StressLevel;
  bayse_market: string;             // market_title
  crowd_yes: number;                // crowd_yes_price — 0-1 decimal
  crowd_no: number;                 // 0-1 decimal
  mid_price: number;                // 0-1 decimal
  spread: number;
  // Bias
  active_bias: string;
  bias_confidence: string;          // bias.confidence
  bias_explanation: string;
  // Decision
  decision_verdict: Verdict;        // decision.verdict
  edge: number;
  win_probability: number;          // 0-1 decimal
  decision_plain: string;
  // Confidence — all 0-100 floats
  rational_pct: number;
  behavioral_pct: number;
  confidence_gap: number;           // confidence.gap
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  score_label: ScoreLabel;
  is_actionable: boolean;
  intervention_urgency: Urgency;
  confidence_plain: string;
  // Allocation — student-friendly aliases now included
  verdict: Verdict;                 // allocation.verdict (primary verdict for UI)
  student_verdict: string;          // SPEND_SAFELY | PROTECT | HOLD
  invest_ngn: number;
  save_ngn: number;
  hold_ngn: number;
  spend_safely_ngn: number;         // student alias
  protect_ngn: number;              // student alias
  buffer_ngn: number;               // student alias
  allocation_pct: number;
  allocation_plain: string;         // allocation.plain_english
  // Score
  decision_score: number;
  score_rating: ScoreRating;
  // Explanation
  summary: string;
  bq_alert: string | null;
  action: string;
  nlp_sentiment: number;
  headlines: unknown[];
}

// ─── /api/stress (StressOnlyResponse schema) ─────────────────────
// Matches intelligence.py StressOnlyResponse exactly
export interface StressData {
  stress_index: number;             // combined_index — 0-100
  level: StressLevel;
  label: string;
  bayse_primary: number;            // 0-1 decimal
  nlp_secondary: number;            // 0-1 decimal
  market_probability: number;       // 0-1 decimal
}

// ─── /api/bayse/markets ──────────────────────────────────────────
export interface BayseMarket {
  name: string;
  probability: number;
  description: string;
}
export interface MarketsData {
  markets: BayseMarket[];
  composite_stress: number;
  bayse_available: boolean;
  market_title: string;
  verdict: string;
}

// ─── /api/bayse/stress ───────────────────────────────────────────
// Matches the actual route response from intelligence.py bayse_stress()
export interface BayseStressData {
  crowd_stress: number;             // ← CORRECT field name from backend route
  bayse_score: number;
  bayse_status: StressLevel;
  market_title: string;
  mid_price: number;
  spread: number;
  available: boolean;
}

// ─── /api/bayse/sentiment ────────────────────────────────────────
export interface BayseSentimentData {
  panic_score: number;
  interpretation: string;
  crowd_yes_price: number;
  imbalance: number;
  volume24h: number;
}

// ─── combined bayse signals ──────────────────────────────────────
export interface BayseSignalsData {
  stress: BayseStressData;
  sentiment: BayseSentimentData;
}

// ─── /api/behavioral/snapshot ────────────────────────────────────
// Returned DIRECTLY (no {success, data} wrapper) — matches behavioral.py
export interface BehavioralEvidence {
  transaction: string;
  date: string;
  trigger: string;
  bayse_fear_at_time: number;       // 0-1 decimal
  zelta_model_at_time: number;      // 0-1 decimal
  gap: number;
  plain_english: string;
}
export interface BehavioralBiasCard {
  bias: string;
  status: string;
  current_strength: number;
  explanation: string;
}
export interface InstinctSay { action: string; amount: number; }
export interface MathSay { action: string; amount: number; }

export interface BehavioralSnapshot {
  active_bias: string;
  confidence: string;
  explanation: string;
  bayse_crowd_fear: number;         // 0-1 decimal from backend
  bayse_zelta_model: number;        // 0-1 decimal from backend
  bayse_gap: number;
  bayse_market_title?: string;
  rational_pct: number;             // 0-100
  behavioral_pct: number;           // 0-100
  decision_gap: number;
  confidence_score?: number;
  confidence_tier?: string;
  intervention_urgency?: string;
  decision_plain_english?: string;
  bias_strength_label?: string;
  bias_strength_value?: number;
  evidence?: BehavioralEvidence[];
  tracked_biases?: BehavioralBiasCard[];
  instinct_says: InstinctSay;
  math_says: MathSay;
  correction_value: number;
  correction_plain: string;
  recommendation?: string;
}

// ─── /api/behavioral/pattern ─────────────────────────────────────
export interface BehavioralWeekItem {
  week: string;
  bias: string;
  strength: number;
  note?: string;
  confidence_label?: string;
}
export interface BehavioralPattern {
  weeks?: BehavioralWeekItem[];
  dominant_bias?: string;
  summary?: string;
  recommendation?: string;
  confidence_gap?: number;
}

// ─── /api/copilot ────────────────────────────────────────────────
export interface CopilotMessage {
  role: "system" | "user" | "assistant" | string;
  content: string;
  timestamp?: string | null;
}
export interface ContextPill { label: string; value: string; }
export interface CopilotRequest {
  question: string;
  context?: Record<string, unknown> | null;
  conversation_history?: CopilotMessage[];
}
export interface CopilotResponse {
  answer: string;
  verdict?: string;
  verdict_amount?: number;
  context_pills?: ContextPill[];
  confidence?: number;
  sources?: string[];
}
export interface CopilotAPIResponse {
  success: boolean;
  data: CopilotResponse;
}

// ─── /api/simulation/* ───────────────────────────────────────────
// Exact field names from simulation_service.py SideHustleSimResult + SavingsSimResult

export type SimulationType = "side_hustle" | "savings";

export interface SideHustleSimRequest {
  investment_amount: number;        // gt=0 required
  hustle_type: string;
  expected_revenue_min: number;     // gt=0 required
  expected_revenue_max: number;     // gt=0 required
  time_horizon_weeks: number;       // ge=1, le=52
  fixed_costs?: number;             // default 0
}

export interface SavingsSimRequest {
  weekly_savings_amount: number;    // gt=0 required
  target_amount: number;            // gt=0 required
  upcoming_obligations: Array<{
    amount: number;
    due_date: string;               // ISO datetime string
    description?: string;
  }>;
}

/** MonteCarloResult from simulation_service */
export interface MonteCarloResult {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
  std_dev: number;
  success_probability: number;      // 0-100 percentage
}

/** SideHustleSimResult from simulation_service */
export interface SideHustleSimResult {
  recommended_investment: number;
  kelly_adjusted_amount: number;    // ← correct field (not kelly_allocation)
  decision_score: number;           // sharpe_score — 0-5
  expected_return_min: number;
  expected_return_max: number;
  expected_return_mean: number;     // ← correct field (not expected_return)
  roi_percentage: number;
  monte_carlo: MonteCarloResult;    // ← correct field (not probability_bands)
  stress_adjusted: boolean;
  verdict: string;
  plain_english: string;
  sharpe_score: number;
}

/** WeekOutcome from simulation_service */
export interface WeekOutcome {
  week: number;
  projected_balance: number;        // ← correct field (not saved_amount)
  status: "green" | "amber" | "red";
  risk_level: number;
}

/** SavingsSimResult from simulation_service */
export interface SavingsSimResult {
  weeks_to_target: number;
  weekly_surplus: number;
  obligation_risk_map: WeekOutcome[]; // ← correct field (not weekly_trajectory)
  projected_shortfall: number;
  savings_score: number;            // 0-5
  green_weeks: number;
  amber_weeks: number;
  red_weeks: number;
  verdict: string;                  // ON_TRACK | REVIEW | SAVE_MORE
  plain_english: string;
}

export interface SimulationResponse {
  success: boolean;
  simulation_type: SimulationType;
  data: SideHustleSimResult | SavingsSimResult | Record<string, unknown>;
}

// ─── /api/wallet ─────────────────────────────────────────────────
export type TransactionCategory =
  | "food" | "transport" | "data" | "education" | "side_hustle"
  | "parent_transfer" | "bursary" | "savings" | "investment"
  | "entertainment" | "utilities" | "other";

export interface SavingsGoal {
  id: string;
  label: string;
  amount: number;
  unlock_date: string;              // ISO datetime
  description?: string | null;
  created_at: string;
  is_active: boolean;
}
export interface Transaction {
  id: string;
  type: "income" | "expense" | "lock" | "unlock";
  amount: number;
  category: TransactionCategory;
  description?: string | null;
  date: string;
  balance_after: number;
}
export interface SpendingHeatItem {
  category: TransactionCategory;
  amount: number;
  percentage: number;
  status: "green" | "amber" | "red";
}
export interface WalletSummary {
  total_balance: number;
  free_cash: number;
  locked_amount: number;
  total_income: number;
  total_expenses: number;
  weekly_burn_rate: number;
  savings_goals: SavingsGoal[];
  recent_transactions: Transaction[];
  spending_heat: SpendingHeatItem[];
  bq_alerts: string[];
  locked_total?: number;            // computed alias for locked_amount
}
export interface WalletResponse { success: boolean; data: WalletSummary; }

// ─── /api/profile ────────────────────────────────────────────────
export interface FinancialProfile {
  monthly_budget?: number | null;
  fee_obligations: Array<Record<string, unknown>>;
  income_sources: string[];
  side_hustle_type?: string | null;
  hostel_fee?: number | null;
  tuition_amount?: number | null;
  risk_tolerance: "low" | "moderate" | "high";
  risk_preference?: string | null;
  capital_range?: string | null;
  monthly_income?: number | null;
  // Academic calendar — feeds λt modifier
  next_exam_date?: string | null;        // ISO date e.g. "2026-07-15"
  semester_start_date?: string | null;
  semester_length_days?: number | null;
  days_to_exam?: number | null;
}

// ─── Gig Board ────────────────────────────────────────────────────
export interface ExtractedCampusGig {
  id: string;
  task: string;
  location: string;
  payout: number;
  payout_raw: string;
  time_estimate?: string | null;
  skills_required?: string[];
  status: "OPEN" | "CLAIMED" | "COMPLETED";
  raw_text: string;
  extracted_at: string;
  poster?: string | null;
  extracted_by_uid?: string | null;
}

// ─── Gig Board ────────────────────────────────────────────────────
export interface ExtractedCampusGig {
  id: string;
  task: string;
  location: string;
  payout: number;
  payout_raw: string;
  time_estimate?: string | null;
  skills_required?: string[];
  status: "OPEN" | "CLAIMED" | "COMPLETED";
  raw_text: string;
  extracted_at: string;
  poster?: string | null;
  extracted_by_uid?: string | null;
}

export interface GigSuggestion {
  id?: string;
  task: string;
  location?: string;
  payout: number;
  hours?: number;
  worth_score?: number;
  effort_score?: number;
  reward_score?: number;
  fit_score?: number;
  reason?: string;
  status?: "OPEN" | "CLAIMED" | "COMPLETED";
  source?: string;
  action_label?: string;
}

export interface GigExtractRequest {
  raw_text: string;
  poster?: string;
}

export interface GigExtractResponse {
  success: boolean;
  gig?: ExtractedCampusGig;
  error?: string;
}
// ─── Intercept Check ──────────────────────────────────────────────
export interface InterceptCheckRequest {
  amount: number;
  category?: string;
}

export interface InterceptCheckResponse {
  should_intercept: boolean;
  verdict: string;
  message: string;
  runway_days: number;
  streak_days: number;
  free_cash: number;
  post_spend_free_cash: number;
}
export interface PreferencesProfile {
  currency: string;
  language: string;
  stress_alert_threshold: number;
  auto_lock_on_crisis: boolean;
  show_bayse_prices: boolean;
  plain_english_mode: boolean;
  primary_goal?: string | null;
  decision_aggressiveness?: number | null;
  stress_sensitivity?: number | null;
}
export interface NotificationsProfile {
  stress_alerts: boolean;
  weekly_bq_report: boolean;
  decision_reminders: boolean;
  bayse_spike_alerts: boolean;
  frequency: "daily" | "weekly" | "real_time" | "off";
}
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  picture?: string | null;
  university?: string | null;
  department?: string | null;
  level?: string | null;
  financial: FinancialProfile;
  preferences: PreferencesProfile;
  notifications: NotificationsProfile;
}
export interface ProfileResponse { success: boolean; data: UserProfile; }
export interface UpdateProfileRequest {
  name?: string | null;
  university?: string | null;
  department?: string | null;
  level?: string | null;
  financial?: Partial<FinancialProfile> | null;
  preferences?: Partial<PreferencesProfile> | null;
  notifications?: Partial<NotificationsProfile> | null;
}

// ─── /api/portfolio ──────────────────────────────────────────────
export interface PerformanceMetrics {
  total_decisions: number;
  correct_decisions: number;
  incorrect_decisions: number;
  pending_decisions: number;
  accuracy_rate: number;
  average_decision_score: number;
  total_invested: number;
  total_returned: number;
  net_pnl: number;
  best_decision_score: number;
  average_bayse_accuracy_gap: number;
}
export interface DecisionRecord {
  id: string;
  verdict: Verdict;
  amount: number;
  rationale: string;
  stress_index: number;
  bayse_fear: number;
  bias: string;
  decision_score: number;
  category: string;
  notes?: string | null;
  actual_outcome?: number | null;
  outcome_label: "pending" | "correct" | "incorrect" | "partial";
  return_amount?: number | null;
  return_percentage?: number | null;
  created_at: string;
  resolved_at?: string | null;
}
export interface PortfolioSummary {
  metrics: PerformanceMetrics;
  recent_decisions: DecisionRecord[];
  behavioral_pattern_summary: string;
}
export interface PortfolioResponse { success: boolean; data: PortfolioSummary; }

// LogDecisionRequest matches portfolio.py LogDecisionRequest exactly
export interface LogDecisionRequest {
  verdict: Verdict;
  amount: number;
  rationale: string;
  stress_index_at_decision: number;
  bayse_fear_at_decision: number;
  bias_at_decision: string;
  decision_score: number;
  category: string;
  notes?: string | null;
}
// UpdateOutcomeRequest matches portfolio.py UpdateOutcomeRequest exactly
export interface UpdateOutcomeRequest {
  decision_id: string;
  actual_outcome: number;
  outcome_label: "pending" | "correct" | "incorrect" | "partial";
  notes?: string | null;
}