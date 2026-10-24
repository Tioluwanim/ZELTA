"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile, type User,
} from "firebase/auth";
import { DEMO, DEV_BEARER } from "./config";
import { auth, firebaseReady } from "./firebase";

interface Ctx {
  user: { name: string; email: string } | null;
  ready: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  google: () => Promise<void>;
  logout: () => Promise<void>;
}
const C = createContext<Ctx | null>(null);

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email or password is wrong.", "auth/wrong-password": "Email or password is wrong.",
    "auth/user-not-found": "No account with that email. Create one instead.",
    "auth/email-already-in-use": "That email already has an account. Sign in instead.",
    "auth/weak-password": "Use a password with at least 6 characters.", "auth/invalid-email": "That email address does not look right.",
    "auth/network-request-failed": "No connection. Check your internet and try again.",
    "auth/popup-closed-by-user": "The Google window was closed before finishing.", "auth/too-many-requests": "Too many tries. Wait a minute and retry.",
  };
  return map[code] ?? (e instanceof Error && !code ? e.message : "Could not sign you in. Try again.");
}

const SKIP_SIGN_IN = DEMO || DEV_BEARER !== "";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFb] = useState<User | null>(null);
  const [ready, setReady] = useState(SKIP_SIGN_IN || !firebaseReady());
  useEffect(() => {
    if (SKIP_SIGN_IN || !firebaseReady()) return;
    return onAuthStateChanged(auth(), (u) => { setFb(u); setReady(true); });
  }, []);
  const value = useMemo<Ctx>(() => ({
    user: SKIP_SIGN_IN ? { name: "Tola", email: "tola@example.com" }
      : fbUser ? { name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "there", email: fbUser.email ?? "" } : null,
    ready, configured: SKIP_SIGN_IN || firebaseReady(),
    signIn: async (e, p) => { await signInWithEmailAndPassword(auth(), e, p); },
    signUp: async (name, e, p) => { const c = await createUserWithEmailAndPassword(auth(), e, p); await updateProfile(c.user, { displayName: name }); },
    google: async () => { await signInWithPopup(auth(), new GoogleAuthProvider()); },
    logout: async () => { if (!SKIP_SIGN_IN && firebaseReady()) await signOut(auth()); },
  }), [fbUser, ready]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useAuth = () => {
  const v = useContext(C);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
};
