"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";

interface Props {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  handleLogin: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  authenticationError: string | null;
  loading: boolean;
}

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  handleLogin,
  authenticationError,
  loading,
}: Props) {
  const router = useRouter();

  return (
    <section className="mx-auto flex w-full flex-col items-center justify-center rounded-xl p-6 pt-2 md:w-[50%] lg:w-[40%] xl:w-[25%]">
      <h1 className="mb-4 text-center text-[22px] font-semibold">
        Welcome Back
      </h1>

      <form
        className="flex w-full flex-col space-y-4"
        onSubmit={handleLogin}
      >
        {/* EMAIL */}
        <label className="text-sm font-medium">
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            placeholder="you@gmail.com"
          />
        </label>

        {/* PASSWORD */}
        <label className="text-sm font-medium">
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            placeholder="Enter your password"
          />
        </label>

        {/* ERROR */}
        {authenticationError && (
          <p className="text-center text-sm text-red-500">
            {authenticationError}
          </p>
        )}

        {/* SUBMIT */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#10b981] px-6 py-2 text-white hover:bg-[#0b825a] disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Continue"}
        </Button>

        {/* DEMO ACCOUNT */}
        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">or try the demo</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setEmail("demo@zelta.app"); setPassword("demo1234"); }}
          className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-6 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98]"
        >
          ⚡ Try Demo Account — No signup needed
        </button>

        {/* NAVIGATION */}
        <p className="text-center text-sm">
          New?{" "}
          <button
            type="button"
            onClick={() => router.push("/sign-up")}
            className="text-green-600 hover:underline"
          >
            Sign up
          </button>
        </p>
      </form>
    </section>
  );
}