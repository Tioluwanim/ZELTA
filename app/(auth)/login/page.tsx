"use client";

import Link from "next/link";
import { useAuth } from "@/context/authContext";
import LoginForm from "./LoginForm";

export default function Login() {
  const {
    email,
    password,
    setEmail,
    setPassword,
    handleLogin,
    authenticationError,
    loading,
  } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-6 text-lg font-semibold tracking-tight text-gray-900"
        style={{ fontFamily: "var(--font-space-grotesk)" }}
      >
        ZELTA
      </Link>
      <LoginForm
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        handleLogin={handleLogin}
        authenticationError={authenticationError}
        loading={loading}
      />
    </main>
  );
}
