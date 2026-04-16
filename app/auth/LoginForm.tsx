"use client";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="max-w-250 mx-auto p-6 rounded-xl flex flex-col justify-center items-between  pt-2 ">
      <h1 className="text-[22px] font-semibold mb-4 text-center">
        Welcome Back!
      </h1>

      <form
        className="space-y-4 flex flex-col justify-center "
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="block text-md font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
            className="mt-1 block w-full rounded-lg border  border-gray-300 px-8 py-1.5 focus:border-green-500 focus:outline-none"
            placeholder="you@gmail.com"
          />
        </label>

        <label className="block text-md font-medium">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 block w-full rounded-lg text-start border border-gray-300 px-8 py-1.5 focus:border-green-500 focus:outline-none"
            placeholder="Enter your password"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-green-800 text-white px-6 py-2 hover:bg-green-900"
        >
          Continue
        </button>
      </form>
    </section>
  );
}
