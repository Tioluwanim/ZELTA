"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/hooks/useFetch";
import type {
  BrainData,
  IntelligenceData,
  StressData,
  MarketsData,
  BayseStressData,
  BayseSentimentData,
  BayseSignalsData,
  BehavioralSnapshot,
  BehavioralPattern,
  SideHustleSimRequest,
  SavingsSimRequest,
  SimulationResponse,
  WalletSummary,
  WalletResponse,
  CopilotRequest,
  CopilotResponse,
  CopilotAPIResponse,
  UserProfile,
  ProfileResponse,
  PortfolioSummary,
  PortfolioResponse,
  LogDecisionRequest,
  UpdateOutcomeRequest,
  UpdateProfileRequest,
} from "@/types/zelta";

// ─── DevTools debug bridge ───────────────────────────────────────
declare global {
  interface Window {
    __ZELTA_DEBUG__: {
      state: Record<string, unknown>;
      enableLogs: () => void;
      disableLogs: () => void;
      logHistory: Array<{ timestamp: Date; hook: string; state: unknown }>;
    };
  }
}

if (typeof window !== "undefined" && !window.__ZELTA_DEBUG__) {
  window.__ZELTA_DEBUG__ = {
    state: {},
    logHistory: [],
    enableLogs: () => {
      localStorage.setItem("ZELTA_DEBUG_LOGS", "true");
      console.log("%c[Zelta Debug] Console logging enabled.", "color: #00ff00");
    },
    disableLogs: () => {
      localStorage.removeItem("ZELTA_DEBUG_LOGS");
      console.log("%c[Zelta Debug] Console logging disabled.", "color: #ff0000");
    },
  };
}

function trackDebugState(hookName: string, state: unknown) {
  if (typeof window === "undefined") return;
  window.__ZELTA_DEBUG__.state[hookName] = state;
  window.__ZELTA_DEBUG__.logHistory.push({ timestamp: new Date(), hook: hookName, state });
  if (window.__ZELTA_DEBUG__.logHistory.length > 200) {
    window.__ZELTA_DEBUG__.logHistory.shift();
  }
  if (localStorage.getItem("ZELTA_DEBUG_LOGS") === "true") {
    console.log(`%c[Zelta] %c${hookName}`, "color:#00aaff;font-weight:bold", "color:inherit", state);
  }
}

// ─── Shared state shape ──────────────────────────────────────────
export interface HookState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ─── Generic one-shot fetch hook ─────────────────────────────────
// IMPORTANT: apiFetch already unwraps { success, data: T } envelopes.
// Never do apiFetch<ProfileResponse>().then(r => r.data) — apiFetch returns T directly.
function useAsyncData<T>(
  fetcher: () => Promise<T>,
  debugKey?: string
): HookState<T> & { refetch: () => void } {
  const [state, setState] = useState<HookState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);

  // Always keep fetcher ref up to date without re-running the effect
  useEffect(() => { fetcherRef.current = fetcher; });

  const run = useCallback(async () => {
    if (!mountedRef.current) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (data === null || data === undefined) throw new Error("Empty response from API");
      if (mountedRef.current) {
        setState({ data, loading: false, error: null });
        if (debugKey) trackDebugState(debugKey, { data, loading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = (err as Error).message;
        setState({ data: null, loading: false, error });
        if (debugKey) trackDebugState(debugKey, { data: null, loading: false, error });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    run();
    return () => { mountedRef.current = false; };
  }, [run]);

  return { ...state, refetch: run };
}

// ─── Behavioral response normalizers ─────────────────────────────
// apiFetch already unwraps {success, data} wrappers.
// These normalizers defensively handle both flat and wrapped shapes.
function normalizeBehavioralSnapshot(raw: unknown): BehavioralSnapshot {
  if (!raw || typeof raw !== "object") throw new Error("Invalid snapshot response");
  const obj = raw as Record<string, unknown>;
  if ("active_bias" in obj) return obj as unknown as BehavioralSnapshot;
  const nested = obj.data ?? obj.snapshot ?? obj.result ?? obj.payload;
  if (nested && typeof nested === "object" && "active_bias" in (nested as object)) {
    return nested as unknown as BehavioralSnapshot;
  }
  throw new Error("Could not parse behavioral snapshot — unexpected shape: " + JSON.stringify(obj).slice(0, 120));
}

function normalizeBehavioralPattern(raw: unknown): BehavioralPattern {
  if (!raw || typeof raw !== "object") throw new Error("Invalid pattern response");
  const obj = raw as Record<string, unknown>;
  if ("weeks" in obj) return obj as unknown as BehavioralPattern;
  const nested = obj.data ?? obj.pattern ?? obj.result ?? obj.payload;
  if (nested && typeof nested === "object" && "weeks" in (nested as object)) {
    return nested as unknown as BehavioralPattern;
  }
  throw new Error("Could not parse behavioral pattern — unexpected shape");
}

// ─── Wallet normalizer ────────────────────────────────────────────
function normalizeWallet(raw: unknown): WalletSummary {
  if (!raw || typeof raw !== "object") throw new Error("Invalid wallet response");
  const obj = raw as Record<string, unknown>;
  // Direct shape (already unwrapped by apiFetch)
  if ("total_balance" in obj) return obj as unknown as WalletSummary;
  // Fallback: envelope survived
  if ("data" in obj && obj.data && typeof obj.data === "object" && "total_balance" in (obj.data as object)) {
    return (obj as unknown as WalletResponse).data;
  }
  throw new Error("Could not parse wallet response");
}

// ─── Profile normalizer ────────────────────────────────────────────
function normalizeProfile(raw: unknown): UserProfile {
  if (!raw || typeof raw !== "object") throw new Error("Invalid profile response");
  const obj = raw as Record<string, unknown>;
  if ("uid" in obj) return obj as unknown as UserProfile;
  if ("data" in obj && obj.data && typeof obj.data === "object" && "uid" in (obj.data as object)) {
    return (obj as unknown as ProfileResponse).data;
  }
  throw new Error("Could not parse profile response");
}

// ─── Portfolio normalizer ─────────────────────────────────────────
function normalizePortfolio(raw: unknown): PortfolioSummary {
  if (!raw || typeof raw !== "object") throw new Error("Invalid portfolio response");
  const obj = raw as Record<string, unknown>;
  if ("metrics" in obj) return obj as unknown as PortfolioSummary;
  if ("data" in obj && obj.data && typeof obj.data === "object" && "metrics" in (obj.data as object)) {
    return (obj as unknown as PortfolioResponse).data;
  }
  throw new Error("Could not parse portfolio response");
}

// ─── Default fallbacks ────────────────────────────────────────────
export const DEFAULT_BEHAVIORAL_SNAPSHOT: BehavioralSnapshot = {
  active_bias: "None",
  confidence: "Unknown",
  explanation: "No behavioral data available.",
  bayse_crowd_fear: 0,
  bayse_zelta_model: 0,
  bayse_gap: 0,
  bayse_market_title: "",
  rational_pct: 0,
  behavioral_pct: 0,
  decision_gap: 0,
  confidence_score: 0,
  confidence_tier: "Low",
  intervention_urgency: "LOW",
  decision_plain_english: "No snapshot data.",
  bias_strength_label: "LOW",
  bias_strength_value: 0,
  evidence: [],
  tracked_biases: [],
  instinct_says: { action: "", amount: 0 },
  math_says: { action: "", amount: 0 },
  correction_value: 0,
  correction_plain: "No correction available.",
  recommendation: "No recommendation available.",
};

export const DEFAULT_BEHAVIORAL_PATTERN: BehavioralPattern = {
  weeks: [],
  dominant_bias: "None",
  summary: "No behavioral history yet.",
  recommendation: "Log decisions to build your pattern.",
  confidence_gap: 0,
};

// ─── Standalone fetchers (usable outside hooks) ───────────────────
export async function fetchBehavioralSnapshot(): Promise<BehavioralSnapshot> {
  const raw = await apiFetch<unknown>("/api/behavioral/snapshot");
  return normalizeBehavioralSnapshot(raw);
}

export async function fetchBehavioralPattern(): Promise<BehavioralPattern> {
  const raw = await apiFetch<unknown>("/api/behavioral/pattern");
  return normalizeBehavioralPattern(raw);
}

// ═══════════════════════════════════════════════════════════════════
//  READ HOOKS
// ═══════════════════════════════════════════════════════════════════

// ─── /api/brain (30s TTL cache) ───────────────────────────────────
export function useBrain(): HookState<BrainData> & { refetch: (force?: boolean) => void } {
  const cacheRef = useRef<{ data: BrainData | null; ts: number }>({ data: null, ts: 0 });
  const mountedRef = useRef(true);
  const BRAIN_TTL = 30_000;

  const [state, setState] = useState<HookState<BrainData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cacheRef.current.data && now - cacheRef.current.ts < BRAIN_TTL) {
      setState({ data: cacheRef.current.data, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiFetch<BrainData>("/api/brain");
      cacheRef.current = { data, ts: Date.now() };
      if (mountedRef.current) setState({ data, loading: false, error: null });
      trackDebugState("useBrain", { data, loading: false, error: null });
    } catch (err) {
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: (err as Error).message });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { ...state, refetch: fetch };
}

// ─── /api/intelligence ───────────────────────────────────────────
export function useIntelligence() {
  return useAsyncData<IntelligenceData>(() => apiFetch("/api/intelligence"), "useIntelligence");
}

// ─── /api/stress (optional polling) ──────────────────────────────
export function useStress(pollInterval = 0): HookState<StressData> {
  const [state, setState] = useState<HookState<StressData>>({
    data: null,
    loading: true,
    error: null,
  });
  const activeRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    activeRef.current = true;
    const run = async () => {
      try {
        const data = await apiFetch<StressData>("/api/stress");
        if (activeRef.current) {
          setState({ data, loading: false, error: null });
          trackDebugState("useStress", { data });
        }
      } catch (err) {
        if (activeRef.current) {
          setState({ data: null, loading: false, error: (err as Error).message });
        }
      }
    };
    run();
    if (pollInterval > 0) intervalRef.current = setInterval(run, pollInterval);
    return () => {
      activeRef.current = false;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [pollInterval]);

  return state;
}

// ─── /api/bayse/markets ──────────────────────────────────────────
export function useBayseMarkets() {
  return useAsyncData<MarketsData>(() => apiFetch("/api/bayse/markets"), "useBayseMarkets");
}

// ─── /api/bayse/stress + /api/bayse/sentiment (parallel) ─────────
export function useBayseSignals(): HookState<BayseSignalsData> & { refetch: () => void } {
  const mountedRef = useRef(true);
  const [state, setState] = useState<HookState<BayseSignalsData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [stress, sentiment] = await Promise.all([
        apiFetch<BayseStressData>("/api/bayse/stress"),
        apiFetch<BayseSentimentData>("/api/bayse/sentiment"),
      ]);
      if (mountedRef.current) {
        setState({ data: { stress, sentiment }, loading: false, error: null });
        trackDebugState("useBayseSignals", { stress, sentiment });
      }
    } catch (err) {
      if (mountedRef.current) setState({ data: null, loading: false, error: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { ...state, refetch: fetch };
}

// ─── /api/behavioral/snapshot ────────────────────────────────────
export function useBehavioralSnapshot() {
  return useAsyncData<BehavioralSnapshot>(fetchBehavioralSnapshot, "useBehavioralSnapshot");
}

// ─── /api/behavioral/pattern ─────────────────────────────────────
export function useBehavioralPattern() {
  return useAsyncData<BehavioralPattern>(fetchBehavioralPattern, "useBehavioralPattern");
}

// ─── /api/wallet ─────────────────────────────────────────────────
export function useWallet() {
  return useAsyncData<WalletSummary>(
    async () => normalizeWallet(await apiFetch<unknown>("/api/wallet")),
    "useWallet"
  );
}

// ─── /api/profile ────────────────────────────────────────────────
export function useProfile() {
  return useAsyncData<UserProfile>(
    async () => normalizeProfile(await apiFetch<unknown>("/api/profile")),
    "useProfile"
  );
}

// ─── /api/portfolio ──────────────────────────────────────────────
export function usePortfolio() {
  return useAsyncData<PortfolioSummary>(
    async () => normalizePortfolio(await apiFetch<unknown>("/api/portfolio")),
    "usePortfolio"
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MUTATION HOOKS
// ═══════════════════════════════════════════════════════════════════

// ─── /api/profile PATCH ──────────────────────────────────────────
export function useUpdateProfile() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<HookState<UserProfile>>({ data: null, loading: false, error: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const updateProfile = useCallback(async (updates: UpdateProfileRequest): Promise<UserProfile | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const raw = await apiFetch<unknown>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      const profile = normalizeProfile(raw);
      if (mountedRef.current) setState({ data: profile, loading: false, error: null });
      trackDebugState("useUpdateProfile", profile);
      return profile;
    } catch (err) {
      if (mountedRef.current) setState({ data: null, loading: false, error: (err as Error).message });
      return null;
    }
  }, []);

  return { ...state, updateProfile };
}

// ─── /api/copilot POST ────────────────────────────────────────────
export function useCopilot() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<HookState<CopilotResponse>>({ data: null, loading: false, error: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const runCopilot = useCallback(async (request: CopilotRequest): Promise<CopilotResponse | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // Backend: { success, data: { answer, verdict, ... } }
      // apiFetch unwraps the outer {success, data} → gives us CopilotResponse directly
      const raw = await apiFetch<unknown>("/api/copilot", {
        method: "POST",
        body: JSON.stringify(request),
      });
      // Handle both direct CopilotResponse and nested CopilotAPIResponse
      let response: CopilotResponse;
      if (raw && typeof raw === "object" && "answer" in (raw as object)) {
        response = raw as CopilotResponse;
      } else if (raw && typeof raw === "object" && "data" in (raw as object)) {
        response = (raw as CopilotAPIResponse).data;
      } else {
        throw new Error("Unexpected copilot response structure");
      }
      if (mountedRef.current) {
        setState({ data: response, loading: false, error: null });
        trackDebugState("useCopilot", response);
      }
      return response;
    } catch (err) {
      if (mountedRef.current) setState({ data: null, loading: false, error: (err as Error).message });
      return null;
    }
  }, []);

  return { ...state, runCopilot };
}

// ─── /api/simulation/side-hustle POST ────────────────────────────
// NOTE: SimulationResponse is { success, simulation_type, data: {} }
// The entire object is the response — apiFetch would try to unwrap "data"
// which would strip simulation_type and success. We use apiFetch<unknown>
// and cast the full object to SimulationResponse.
export function useSideHustleSimulation() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<HookState<SimulationResponse>>({ data: null, loading: false, error: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const runSimulation = useCallback(async (request: SideHustleSimRequest): Promise<SimulationResponse | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const raw = await apiFetch<unknown>("/api/simulation/side-hustle", {
        method: "POST",
        body: JSON.stringify(request),
      });
      // raw is { success, simulation_type, data: {...} }
      // apiFetch unwraps "data" key → raw is the inner data object
      // We need to reconstruct or handle both cases
      let result: SimulationResponse;
      if (raw && typeof raw === "object" && "simulation_type" in (raw as object)) {
        // Full envelope survived (apiFetch didn't unwrap because success is at top level too)
        result = raw as SimulationResponse;
      } else {
        // apiFetch unwrapped data → wrap it back for components
        result = { success: true, simulation_type: "side_hustle", data: raw as Record<string, unknown> };
      }
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
        trackDebugState("useSideHustleSimulation", result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) setState({ data: null, loading: false, error: (err as Error).message });
      return null;
    }
  }, []);

  return { ...state, runSimulation };
}

// ─── /api/simulation/savings POST ────────────────────────────────
export function useSavingsSimulation() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<HookState<SimulationResponse>>({ data: null, loading: false, error: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const runSimulation = useCallback(async (request: SavingsSimRequest): Promise<SimulationResponse | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const raw = await apiFetch<unknown>("/api/simulation/savings", {
        method: "POST",
        body: JSON.stringify(request),
      });
      let result: SimulationResponse;
      if (raw && typeof raw === "object" && "simulation_type" in (raw as object)) {
        result = raw as SimulationResponse;
      } else {
        result = { success: true, simulation_type: "savings", data: raw as Record<string, unknown> };
      }
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
        trackDebugState("useSavingsSimulation", result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) setState({ data: null, loading: false, error: (err as Error).message });
      return null;
    }
  }, []);

  return { ...state, runSimulation };
}

// ─── /api/portfolio/decisions POST ───────────────────────────────
export function useLogDecision() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<HookState<string>>({ data: null, loading: false, error: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const logDecision = useCallback(async (decision: LogDecisionRequest): Promise<string | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // Backend returns a plain string (decision ID)
      const data = await apiFetch<string>("/api/portfolio/decisions", {
        method: "POST",
        body: JSON.stringify(decision),
      });
      if (mountedRef.current) setState({ data, loading: false, error: null });
      trackDebugState("useLogDecision", { decisionId: data });
      return data;
    } catch (err) {
      if (mountedRef.current) setState({ data: null, loading: false, error: (err as Error).message });
      return null;
    }
  }, []);

  return { ...state, logDecision };
}

// ─── /api/portfolio/decisions/outcome PATCH ──────────────────────
export function useRecordOutcome() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<HookState<string>>({ data: null, loading: false, error: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const recordOutcome = useCallback(async (outcome: UpdateOutcomeRequest): Promise<string | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiFetch<string>("/api/portfolio/decisions/outcome", {
        method: "PATCH",
        body: JSON.stringify(outcome),
      });
      if (mountedRef.current) setState({ data, loading: false, error: null });
      trackDebugState("useRecordOutcome", { result: data });
      return data;
    } catch (err) {
      if (mountedRef.current) setState({ data: null, loading: false, error: (err as Error).message });
      return null;
    }
  }, []);

  return { ...state, recordOutcome };
}
// ─── Sapa Health Bar ──────────────────────────────────────────────
// Derives the student's financial health score (0-100) from wallet + intelligence data.
// 100 = fully healthy, 0 = Sapa (broke).
export function useSapaHealth(): {
  sapaScore: number;          // 0-100 (100 = healthy)
  runwayDays: number;
  weeklyBurn: number;
  freeCash: number;
  streakDays: number;
  lambdaT: number;            // exam proximity modifier 0-1
  daysToExam: number | null;
  loading: boolean;
} {
  const wallet = useWallet();
  const profile = useProfile();

  const freeCash = wallet.data?.free_cash ?? 0;
  const weeklyBurn = wallet.data?.weekly_burn_rate ?? 1;
  const runwayDays = weeklyBurn > 0 ? Math.round((freeCash / weeklyBurn) * 7) : 99;

  // Compute λt — exam proximity modifier
  // λt = 1 - (days_to_exam / semester_length)
  // As exams approach λt → 0 (less capital allowed)
  let lambdaT = 1.0;
  let daysToExam: number | null = null;
  const financial = profile.data?.financial as any;
  if (financial?.next_exam_date) {
    const examDate = new Date(financial.next_exam_date);
    const today = new Date();
    daysToExam = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / 86400000));
    const semesterLen = financial.semester_length_days ?? 120;
    lambdaT = Math.max(0.1, Math.min(1.0, daysToExam / semesterLen));
  }

  // Sapa score: combines runway, free cash ratio, exam proximity
  const runwayScore = Math.min(100, (runwayDays / 30) * 100);   // 30 days = 100%
  const examPenalty = (1 - lambdaT) * 20;                        // exam proximity penalty
  const sapaScore = Math.max(0, Math.min(100, Math.round(runwayScore - examPenalty)));

  // Simple streak: days since last entertainment/other spend (proxy)
  const transactions = wallet.data?.recent_transactions ?? [];
  let streakDays = 0;
  const today = new Date();
  for (const tx of transactions) {
    if (tx.type === "expense" && ["entertainment", "other"].includes(tx.category)) {
      const txDate = new Date(tx.date);
      const daysDiff = Math.floor((today.getTime() - txDate.getTime()) / 86400000);
      streakDays = daysDiff;
      break;
    }
  }

  return {
    sapaScore,
    runwayDays,
    weeklyBurn,
    freeCash,
    streakDays,
    lambdaT,
    daysToExam,
    loading: wallet.loading || profile.loading,
  };
}