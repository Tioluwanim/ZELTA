"use client";

import Button from "@/components/Button";
import { useRouter } from "next/navigation";

interface Props {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  handleSignUp: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  authenticationError: string | null;
  loading: boolean;
}

export default function SignUpForm({
  email,
  password,
  setEmail,
  setPassword,
  handleSignUp,
  authenticationError,
  loading,
}: Props) {
  const router = useRouter();

  return (
    <section className="mx-auto flex w-full flex-col justify-center rounded-xl p-6 pt-2 md:w-[50%] lg:w-[40%] xl:w-[25%]">
      <h1 className="mb-4 text-center text-[22px] font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        Create Account
      </h1>

      <form
        className="flex w-full flex-col space-y-4"
        onSubmit={handleSignUp}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
            placeholder="Create a password"
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
          className="w-full rounded-full bg-[#10b981] px-6 py-2 text-white hover:bg-[#0b825a] disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>

        {/* NAVIGATION */}
        <p className="text-center text-sm">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-green-600 hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    </section>
  );
}
