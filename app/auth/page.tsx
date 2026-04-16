"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="flex flex-col items-center">
        {isLogin ? <LoginForm /> : <SignUpForm />}

        <p className="text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-green-800 font-semibold hover:underline"
          >
            {isLogin ? "Sign up" : "Sign In"}
          </button>
        </p>
      </div>
    </main>
  );
}
