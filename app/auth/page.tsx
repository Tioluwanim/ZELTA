"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Zel from "@/components/Zel";
import { Button, Card } from "@/components/ui";
import { friendlyAuthError, useAuth } from "@/lib/auth";

function Form() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready, configured, signIn, signUp, google } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user) router.replace("/path"); }, [ready, user, router]);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await fn(); router.replace("/path"); } catch (e) { setError(friendlyAuthError(e)); } finally { setBusy(false); }
  }
  const field = "mt-1 w-full rounded-2xl border-2 border-line bg-paper px-4 min-h-12 text-[17px] focus:border-indigo outline-none";
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-5 py-10">
      <div className="flex flex-col items-center gap-1 text-center">
        <Zel mood={error ? "worried" : "happy"} size={96} bob />
        <h1 className="text-3xl font-bold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      </div>
      <Card>
        {!configured ? (
          <p role="alert" className="text-coral-deep">Sign-in is not set up on this build. Add the NEXT_PUBLIC_FIREBASE_* values, or run with NEXT_PUBLIC_DEMO=1.</p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(() => mode === "signup" ? signUp(name.trim(), email, password) : signIn(email, password)); }}>
            {mode === "signup" && <label className="block font-semibold">Your name<input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required /></label>}
            <label className="block font-semibold">Email<input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
            <label className="block font-semibold">Password<input className={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required /></label>
            {error && <p role="alert" className="font-semibold text-coral-deep">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}</Button>
            <Button type="button" variant="quiet" className="w-full" disabled={busy} onClick={() => void run(google)}>Continue with Google</Button>
          </form>
        )}
      </Card>
      <button className="font-semibold text-indigo underline underline-offset-4" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }}>
        {mode === "signup" ? "I already have an account" : "Create a new account"}
      </button>
    </main>
  );
}
export default function AuthPage() { return <Suspense><Form /></Suspense>; }
