import { API_URL, DEMO } from "./config";
import { auth, firebaseReady } from "./firebase";
import * as demo from "./demo";
import type {
  CopilotAnswer, CopilotMessage, Gig, ProfilePatch, SavingsSim, Stress, TxCategory, UserProfile, WalletSummary,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function token(): Promise<string> {
  if (!firebaseReady()) throw new ApiError("Sign-in is not configured.", 401);
  const u = auth().currentUser;
  if (!u) throw new ApiError("Please sign in again.", 401);
  return u.getIdToken();
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError("The server address is not set (NEXT_PUBLIC_API_URL).", 0);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}`, ...init.headers },
    });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = typeof j.detail === "string" ? j.detail : j.message ?? ""; } catch { /* no body */ }
    throw new ApiError(
      res.status === 401 ? "Your session expired. Sign in again." : detail || `Request failed (${res.status}).`, res.status);
  }
  return res.json() as Promise<T>;
}
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  profile: async (): Promise<UserProfile> => DEMO ? demo.profile() : (await call<{ data: UserProfile }>("/api/profile")).data,
  updateProfile: async (p: ProfilePatch): Promise<UserProfile> =>
    DEMO ? demo.updateProfile(p) : (await call<{ data: UserProfile }>("/api/profile", { method: "PATCH", body: JSON.stringify(p) })).data,
  wallet: async (): Promise<WalletSummary> => DEMO ? demo.wallet() : (await call<{ data: WalletSummary }>("/api/wallet")).data,
  addIncome: (amount: number, source: TxCategory, description?: string) =>
    DEMO ? demo.addTx("income", amount, source) : call("/api/wallet/income", post({ amount, source, description })),
  addExpense: (amount: number, category: TxCategory, description?: string) =>
    DEMO ? demo.addTx("expense", amount, category) : call("/api/wallet/expense", post({ amount, category, description })),
  lockSavings: (amount: number, label: string, unlockDate: string) =>
    DEMO ? demo.lock(amount, label, unlockDate) : call("/api/wallet/lock", post({ amount, label, unlock_date: unlockDate })),
  stress: async (): Promise<Stress> => DEMO ? demo.stress() : (await call<{ data: Stress }>("/api/stress")).data,
  ask: async (question: string, history: CopilotMessage[]): Promise<CopilotAnswer> =>
    DEMO ? demo.ask(question) : (await call<{ data: CopilotAnswer }>("/api/copilot", post({ question, conversation_history: history }))).data,
  gigs: async (): Promise<Gig[]> => DEMO ? demo.gigs() : (await call<{ gigs: Gig[] }>("/api/gig/list?status_filter=OPEN")).gigs,
  simulateSavings: async (weekly: number, target: number): Promise<SavingsSim> =>
    DEMO ? demo.simulateSavings(weekly, target)
      : (await call<{ data: SavingsSim }>("/api/simulation/savings", post({ weekly_savings_amount: weekly, target_amount: target }))).data,
};
