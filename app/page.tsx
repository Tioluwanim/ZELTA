"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Zel from "@/components/Zel";
import { LinkButton } from "@/components/ui";
import { DEMO } from "@/lib/config";
import { useAuth } from "@/lib/auth";

export default function Welcome() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && user) router.replace("/path"); }, [ready, user, router]);
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl items-center gap-8 px-5 py-10 md:grid-cols-2">
      <div className="flex justify-center md:order-2"><Zel mood="cheer" size={240} bob label="Zel, the ZELTA mascot" /></div>
      <div className="space-y-6 text-center md:text-left">
        <h1 className="text-5xl font-bold leading-[1.05] md:text-6xl">Know how long your money lasts.</h1>
        <p className="mx-auto max-w-md text-lg text-soft md:mx-0">
          Zel turns your real balance, bills and spending into small daily steps, and answers money questions with numbers you can check.
        </p>
        <div className="mx-auto flex max-w-sm flex-col gap-3 md:mx-0">
          <LinkButton href="/auth?mode=signup" variant="reward">Get started</LinkButton>
          <LinkButton href="/auth" variant="quiet">I already have an account</LinkButton>
          {DEMO && <LinkButton href="/path" variant="quiet">Look around with sample data</LinkButton>}
        </div>
      </div>
    </main>
  );
}
