"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Briefcase,
  BookOpen,
  Sparkles,
  Bolt,
  CircleDot,
  BarChart3,
  ShieldAlert,
} from "lucide-react";

const headlineWords = [
  "Give",
  "every",
  "Nigerian",
  "student",
  "confidence",
  "in",
  "their",
  "next",
  "financial",
  "decision",
  "—",
  "before",
  "the",
  "money",
  "moves,",
  "not",
  "after.",
];

const featureCards = [
  {
    title: "Market Pulse",
    description: "Live campus and market stress signals so you see pressure before you spend.",
    icon: TrendingUp,
    accent: "from-sky-400 to-cyan-500",
  },
  {
    title: "Intent Check",
    description: "Smart spend classification for necessity, impulse, and academic urgency.",
    icon: ShieldCheck,
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    title: "Academic Stress",
    description: "Exam countdown and stress modifiers keep your decisions aligned with school life.",
    icon: Clock,
    accent: "from-emerald-400 to-lime-500",
  },
  {
    title: "The Gig Connection",
    description: "Earn back runway with student-first micro opportunities and side hustle matches.",
    icon: Briefcase,
    accent: "from-amber-400 to-orange-500",
  },
];

const timelineSteps = [
  {
    title: "Payment Initiated",
    description: "ZELTA sees the transaction before your account is charged.",
    icon: ArrowRight,
  },
  {
    title: "Context Analysis",
    description: "It factors in your allowance, exam schedule, and monthly rhythm.",
    icon: BookOpen,
  },
  {
    title: "Risk Detection",
    description: "Stress, bias, and runway risk are evaluated in real time.",
    icon: ShieldAlert,
  },
  {
    title: "Survival Mode",
    description: "If your runway is thin, ZELTA shifts recommendations to protect you.",
    icon: Sparkles,
  },
  {
    title: "Gig Opportunity Engine",
    description: "Suggested side hustles surface automatically when the budget gaps appear.",
    icon: Bolt,
  },
  {
    title: "Guardian Recommendation",
    description: "Full guidance is delivered with autonomy preserved — never a hard block.",
    icon: CircleDot,
  },
];

const variants = {
  container: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  },
  word: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="relative overflow-hidden pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-36 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <section className="relative grid gap-10 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12">
            <div className="space-y-10">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={variants}
                className="space-y-6"
              >
                <div className="flex flex-wrap gap-3 text-sm uppercase tracking-[0.32em] text-cyan-300/80">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">
                    <Sparkles className="h-4 w-4 text-cyan-300" /> AI Financial Guardian
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-slate-400">
                    Built for Nigerian students
                  </span>
                </div>

                <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {headlineWords.map((word, index) => (
                    <motion.span
                      key={`${word}-${index}`}
                      variants={variants.word}
                      className="inline-block mr-2 whitespace-nowrap"
                    >
                      {word}
                    </motion.span>
                  ))}
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                  className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl"
                >
                  Zelta combines burner-proof spending intelligence with stress-aware student guidance so every allowance decision is wise, calm, and future-safe.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                  className="flex flex-col gap-4 sm:flex-row sm:items-center"
                >
                  <Link
                    href="#waitlist"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300"
                  >
                    Join Waitlist
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-sm text-slate-500">
                    Launching with OPay Innovation Challenge 2026 support.
                  </span>
                </motion.div>
              </motion.div>
            </div>

            <div className="relative isolate overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40 ring-1 ring-white/5">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_50%)]" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between rounded-3xl bg-slate-950/50 p-4 ring-1 ring-slate-700/70">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Monthly Sapa Incidence</p>
                    <p className="mt-2 text-3xl font-semibold text-white">72%</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-800/70 text-cyan-300">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-slate-800/90 bg-slate-950/90 p-5 text-center">
                  <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-slate-900/80 ring-2 ring-cyan-500/20">
                    <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(16,185,129,0.85)_0%,rgba(16,185,129,0.14)_72%,rgba(56,189,248,0.2)_72%,rgba(56,189,248,0.12)_100%)]" />
                    <div className="absolute inset-7 rounded-full bg-slate-950" />
                    <div className="relative text-center">
                      <p className="text-2xl font-bold text-white">72%</p>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">at risk</p>
                    </div>
                  </div>
                  <p className="max-w-sm text-sm leading-6 text-slate-400">
                    More than two in three students feel pressure before month end. Zelta intercepts bad spend decisions while there is still runway.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-20 grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.45)]">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">The problem</p>
                <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Monthly allowance runs out before the next transfer.</h2>
                <p className="mt-4 text-base leading-7 text-slate-400">
                  Most Nigerian university students get paid once per month. When bad spend decisions happen, stress rises and the rest of the month is a scramble.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Old way</p>
                    <p className="mt-3 text-lg font-semibold text-white">Warn after the money is gone</p>
                  </div>
                  <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Zelta way</p>
                    <p className="mt-3 text-lg font-semibold text-cyan-100">Intercept before the transaction completes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">How Zelta works</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {featureCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.title}
                      whileHover={{ y: -6 }}
                      className={`rounded-3xl border border-slate-800/90 bg-slate-950/75 p-6 transition-shadow shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_15px_50px_rgba(56,189,248,0.15)]`}
                    >
                      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${card.accent} text-white shadow-xl shadow-cyan-500/10`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mt-20 rounded-[2rem] border border-slate-800/80 bg-slate-900/90 p-8 shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Interception workflow</p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">From payment intent to informed choice.</h2>
              </div>
              <div className="rounded-3xl border border-cyan-500/20 bg-slate-950/70 px-5 py-4 text-sm text-slate-300">
                Fully informed choice — guided, never blocked. Autonomy preserved.
              </div>
            </div>

            <div className="mt-8 space-y-6">
              {timelineSteps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: -28 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.25)]"
                  >
                    <div className="absolute right-5 top-5 h-14 w-14 rounded-3xl bg-cyan-500/10 ring-1 ring-cyan-400/30" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{step.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          <footer className="mt-20 border-t border-slate-800/70 py-8 text-center text-sm text-slate-500">
            Team Zelta • OPay Innovation Challenge 2026
          </footer>
        </div>
      </main>
    </div>
  );
}
