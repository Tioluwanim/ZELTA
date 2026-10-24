"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calculator, HandCoins, ShieldCheck } from "lucide-react";
import Zel from "@/components/Zel";
import { ClothStrip, SpendingCloth } from "@/components/Cloth";
import { LinkButton } from "@/components/ui";
import { DEMO } from "@/lib/config";
import { useAuth } from "@/lib/auth";

// Illustrative numbers for the page only. They are labelled as a sample wherever they appear.
const m = (n: number) => ({ minor: n * 100, currency: "NGN", display: `${n}` });
const SAMPLE_POS = { total_connected_money: m(53500), outflow_28d: m(60144), bills_due_in_horizon: m(15000), available_after_bills: m(38500), cushion: m(10000), safe_flexible: m(8000), horizon_days: 30, notes: [] };
const SAMPLE_DAYS = [1800, 0, 2400, 0, 600, 3100, 0, 900, 0, 2000, 1500, 0, 0, 4200, 800, 0, 1200, 2600, 0, 500, 0, 1800, 3500, 0, 700, 0, 1900, 1800]
  .map((v, i) => ({ date: new Date(2026, 8, 10 + i).toISOString().slice(0, 10), minor: v * 100 }));
const DYE = { ["--stitch" as string]: "rgba(245,239,226,.10)" };

const STEPS = [
  { n: "1", t: "Tell Zel what you have", d: "Your balance, what comes in, and the bills you know are coming. It takes about two minutes.", pat: "oniko" },
  { n: "2", t: "See how long it lasts", d: "Zel works out your runway in days, with the bills counted and the date it could run out.", pat: "alabere" },
  { n: "3", t: "Check before you spend", d: "Type an amount. Zel says go ahead, careful or hold off, and shows which part of your money decided that.", pat: "batani" },
];
const FAQ = [
  ["Does ZELTA connect to my bank?", "Not yet. Today you enter your balance, income and spending yourself, and every number is labelled as self-reported. Bank connections will come later, only with your permission."],
  ["Can ZELTA move my money?", "No. It never moves money and never asks you to send money to anyone. It only reads what you give it and tells you what it works out."],
  ["Where do the answers come from?", "From maths on your own numbers: your balance, bills and past spending. The assistant explains the result in plain words. It does not make up the numbers."],
  ["What if Zel does not know something?", "It says so. Missing information stays unknown. It is never quietly treated as zero."],
  ["Is this financial advice?", "No. ZELTA gives you information to decide with. The limits and rules it uses are proposals we are still testing, not guarantees."],
];

function Nav() {
  return (
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4" aria-label="Main">
      <Link href="/" className="flex items-center gap-2 font-display text-2xl font-extrabold"><Zel size={40} />ZELTA</Link>
      <div className="flex items-center gap-2">
        <Link href="/auth" className="rounded-[12px] px-4 py-2 font-display font-bold hover:bg-white/10">Sign in</Link>
        <LinkButton href="/auth?mode=signup" variant="reward" className="min-h-10 px-4 text-base">Get started</LinkButton>
      </div>
    </nav>
  );
}

export default function Landing() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && user && !DEMO) router.replace("/path"); }, [ready, user, router]);

  return (
    <div>
      {/* Hero: indigo cloth */}
      <header className="cloth oniko dyed" style={{ ...DYE, ["--size" as string]: "56px" }}>
        <Nav />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-8 md:grid-cols-[1.1fr_.9fr] md:pt-14">
          <div className="space-y-6 text-center md:text-left">
            <p className="mx-auto inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold tracking-wide md:mx-0">YOUR MONEY, IN DAYS</p>
            <h1 className="text-5xl font-extrabold leading-[1.02] md:text-7xl">Know how long your money lasts.</h1>
            <p className="mx-auto max-w-lg text-lg opacity-90 md:mx-0">ZELTA is a money twin for your pocket. It counts your bills, reads your spending, and tells you in plain days how far your money goes, before you spend it.</p>
            <div className="mx-auto flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row md:mx-0">
              <LinkButton href="/auth?mode=signup" variant="reward">Start free <ArrowRight size={20} /></LinkButton>
              {DEMO ? <LinkButton href="/path" variant="quiet">Look around with sample data</LinkButton> : <a href="#how" className="btn inline-flex min-h-12 items-center justify-center rounded-[14px] px-5 font-display font-bold ring-2 ring-white/30">See how it works</a>}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -top-10 right-2 z-10"><Zel mood="cheer" size={112} bob label="Zel, the ZELTA mascot" /></div>
            <div className="relative rotate-2 rounded-[28px] bg-paper p-6 text-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,.55)]">
              <p className="text-sm font-bold text-soft">Sample numbers</p>
              <p className="mt-3 text-soft">At this pace your money lasts about</p>
              <p className="num text-7xl font-extrabold leading-none text-indigo">17<span className="ml-2 text-2xl font-bold text-soft">days</span></p>
              <div className="mt-5"><ClothStrip position={SAMPLE_POS} /></div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl text-4xl font-extrabold md:text-5xl">Three steps. No spreadsheet.</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="overflow-hidden rounded-[24px] border-[1.5px] border-line bg-paper">
                <div className={`cloth ${s.pat} dyed grid h-28 place-items-center`} style={DYE}><span className="num text-6xl font-extrabold">{s.n}</span></div>
                <div className="p-6"><h3 className="text-2xl font-bold">{s.t}</h3><p className="mt-2 text-[17px] text-soft">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        {/* What Zel does */}
        <section className="bg-paper py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-4xl font-extrabold md:text-5xl">Made for money that has to stretch.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-6">
              <div className="rounded-[24px] border-[1.5px] border-line bg-chalk p-6 md:col-span-3">
                <p className="font-display text-sm font-extrabold tracking-wide text-indigo">BEFORE YOU SPEND</p>
                <h3 className="mt-1 text-2xl font-bold">A clear yes, careful, or hold off.</h3>
                <div className="mt-5 rounded-2xl bg-coral-tint p-4 text-coral-deep">
                  <p className="font-display text-lg font-bold">Hold off on ₦20,000</p>
                  <p>That takes you below your minimum safe amount in about 15 days.</p>
                </div>
                <p className="mt-3 text-sm text-soft">Sample. Every answer lists the reasons behind it.</p>
              </div>
              <div className="rounded-[24px] border-[1.5px] border-line bg-chalk p-6 md:col-span-3">
                <p className="font-display text-sm font-extrabold tracking-wide text-indigo">YOUR SPENDING, AS CLOTH</p>
                <h3 className="mt-1 text-2xl font-bold">28 days at a glance.</h3>
                <div className="mt-5"><SpendingCloth series={SAMPLE_DAYS} /></div>
                <p className="mt-3 text-sm text-soft">Sample. Deeper dye means more spent that day.</p>
              </div>
              <div className="cloth alabere dyed rounded-[24px] p-6 md:col-span-4" style={DYE}>
                <p className="font-display text-sm font-extrabold tracking-wide opacity-80">COACH</p>
                <h3 className="mt-1 text-2xl font-bold">Ask in your own words.</h3>
                <div className="mt-5 space-y-3">
                  <p className="ml-auto w-fit max-w-[85%] rounded-[20px] rounded-br-md bg-danfo px-4 py-2.5 font-semibold text-ink">What if I spend ₦2,000 less each week?</p>
                  <p className="w-fit max-w-[90%] rounded-[20px] rounded-bl-md bg-paper px-4 py-2.5 text-ink">You would run out around 3 days later. That is about 20 days instead of 17.</p>
                </div>
              </div>
              <div className="rounded-[24px] border-[1.5px] border-line bg-danfo-tint p-6 md:col-span-2">
                <p className="font-display text-sm font-extrabold tracking-wide">YOUR STEP</p>
                <h3 className="mt-1 text-2xl font-bold">One small thing a day.</h3>
                <p className="mt-2 text-[17px]">A path of simple steps. Add your bills, log what you spent, set money aside.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl text-4xl font-extrabold md:text-5xl">Numbers you can check.</h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {[{ I: Calculator, t: "Maths first", d: "Your runway, forecast and limits come from calculations on your own data. The assistant only explains them." },
              { I: HandCoins, t: "Unknown stays unknown", d: "If Zel is missing information, it says so. It never fills a gap with a made-up zero or a guess." },
              { I: ShieldCheck, t: "You stay in control", d: "ZELTA never moves your money and never asks you to send any. You decide, with better information." }].map(({ I, t, d }) => (
              <li key={t} className="rounded-[24px] border-[1.5px] border-line bg-paper p-6"><I size={30} className="text-indigo" aria-hidden /><h3 className="mt-3 text-2xl font-bold">{t}</h3><p className="mt-2 text-[17px] text-soft">{d}</p></li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-soft">Today ZELTA works from what you tell it. It is not connected to your bank, and it does not yet claim to be. The thresholds it uses are proposals we are still testing.</p>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 pb-20">
          <h2 className="text-4xl font-extrabold">Questions</h2>
          <div className="mt-6 divide-y divide-line rounded-[24px] border-[1.5px] border-line bg-paper">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-bold">{q}<span aria-hidden className="text-indigo transition group-open:rotate-45">+</span></summary><p className="mt-2 text-[17px] text-soft">{a}</p></details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="cloth batani dyed" style={DYE}>
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-5 py-20 text-center">
            <Zel mood="happy" size={110} bob />
            <h2 className="text-4xl font-extrabold md:text-5xl">Find out how many days you have.</h2>
            <LinkButton href="/auth?mode=signup" variant="reward">Start free <ArrowRight size={20} /></LinkButton>
          </div>
        </section>
      </main>

      <footer className="bg-dye-4 px-5 py-8 text-center text-sm text-resist/80">
        <p>ZELTA gives information, not financial advice. Sample numbers on this page are illustrations.</p>
        <p className="mt-1">© {new Date().getFullYear()} Team ZELTA</p>
      </footer>
    </div>
  );
}
