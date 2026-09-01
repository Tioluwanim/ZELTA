"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoothScroll, usePrefersReducedMotion } from "@/hooks/useSmoothScroll";
import FloatingNav from "@/components/FloatingNav";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Matches the app's own tokens (see globals.css / dashboard components):
// white/gray-50 surfaces, emerald as the primary accent, red for risk.
const EMERALD = "#10b981";
const EMERALD_DARK = "#047857";
const RED = "#ef4444";
const GRAY_LINE = "#d1d5db";

const heroWords = ["Your", "finances", "already", "have", "a", "shape."];
const heroWordsAccent = ["ZELTA", "shows", "it", "to", "you", "first."];

const beats = [
  {
    eyebrow: "Week one",
    line: "Most months start fine.",
  },
  {
    eyebrow: "Week three",
    line: "The Twin sees the bend before you do — deterministic cash-flow math and statistical forecasting on your real transactions, never a language model guessing your numbers.",
  },
  {
    eyebrow: "Before you spend",
    line: "\u201CWhat happens if I buy this laptop now?\u201D Run it through the Future Lab and see the trajectory change before you commit.",
  },
  {
    eyebrow: "When the gap is real",
    line: "The Opportunity Engine matches the shortfall to legitimate, skill-fit gigs — insight that turns into action, not just an alert.",
  },
];

const pipeline = [
  {
    title: "Deterministic engine",
    body: "Cash-flow math on your actual balance and obligations. No language model touches the numbers.",
  },
  {
    title: "Statistical forecasting",
    body: "Trend and seasonality drawn from real transaction history, pulled in through Mono.",
  },
  {
    title: "Plain-language narration",
    body: "An LLM explains what the math already found. It narrates the result — it doesn't invent it.",
  },
  {
    title: "Future Lab",
    body: "Simulate a decision against your real trajectory before you make it.",
  },
  {
    title: "Opportunity Engine",
    body: "When a shortfall is coming, get matched to gigs that actually fit your skills and schedule.",
  },
];

export default function Home() {
  const reducedMotion = usePrefersReducedMotion();
  useSmoothScroll();

  const heroRef = useRef<HTMLDivElement | null>(null);
  const trajectorySectionRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const trunkPathRef = useRef<SVGPathElement | null>(null);
  const branchDownRef = useRef<SVGPathElement | null>(null);
  const branchUpRef = useRef<SVGPathElement | null>(null);
  const beatRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Hero entrance — one orchestrated moment, word by word.
  useEffect(() => {
    const words = heroRef.current?.querySelectorAll("[data-word]");
    if (!words || words.length === 0) return;

    if (reducedMotion) {
      gsap.set(words, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      words,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.045,
        delay: 0.2,
      }
    );
  }, [reducedMotion]);

  // The trajectory sequence — the one signature moment of the page.
  useEffect(() => {
    if (reducedMotion) return;
    if (!trajectorySectionRef.current || !pinRef.current) return;
    if (!trunkPathRef.current || !branchDownRef.current || !branchUpRef.current) return;

    const ctx = gsap.context(() => {
      const trunk = trunkPathRef.current!;
      const branchDown = branchDownRef.current!;
      const branchUp = branchUpRef.current!;

      const trunkLen = trunk.getTotalLength();
      const downLen = branchDown.getTotalLength();
      const upLen = branchUp.getTotalLength();

      gsap.set(trunk, { strokeDasharray: trunkLen, strokeDashoffset: trunkLen });
      gsap.set(branchDown, { strokeDasharray: downLen, strokeDashoffset: downLen, opacity: 0.5 });
      gsap.set(branchUp, { strokeDasharray: upLen, strokeDashoffset: upLen });
      gsap.set(beatRefs.current, { opacity: 0, y: 18 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trajectorySectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          pin: pinRef.current,
        },
      });

      // Trunk draws across the first half of the sequence.
      tl.to(trunk, { strokeDashoffset: 0, ease: "none", duration: 4 }, 0);
      // Branches draw across the second half — the fork moment.
      tl.to(branchDown, { strokeDashoffset: 0, ease: "none", duration: 2 }, 4);
      tl.to(branchUp, { strokeDashoffset: 0, ease: "none", duration: 2 }, 4);
      // Once the Opportunity Engine resolves it, the downward branch fades.
      tl.to(branchDown, { opacity: 0.15, duration: 1 }, 6);
      tl.to(branchUp, { opacity: 1, duration: 1 }, 6);

      // Four narrative beats, each taking a two-unit slot on the same scrub.
      beats.forEach((_, i) => {
        const el = beatRefs.current[i];
        if (!el) return;
        const start = i * 2;
        const isLast = i === beats.length - 1;

        tl.to(el, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, start);
        if (!isLast) {
          tl.to(el, { opacity: 1, duration: 0.9 }, start + 0.5);
          tl.to(el, { opacity: 0, y: -18, duration: 0.5, ease: "power2.in" }, start + 1.5);
        } else {
          tl.to(el, { opacity: 1, duration: 1.4 }, start + 0.5);
        }
      });
    }, trajectorySectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div id="top" className="min-h-screen bg-white text-gray-900">
      <FloatingNav />

      {/* Hero */}
      <section ref={heroRef} className="relative mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-10 sm:pt-32">
        <p className="text-sm text-gray-500">AI Financial Twin, built for Nigerian university students</p>
        <h1
          className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] text-gray-900 sm:text-6xl"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          {heroWords.map((w, i) => (
            <span key={`h1-${i}`} data-word className="mr-3 inline-block">
              {w}
            </span>
          ))}
          <br className="hidden sm:block" />
          {heroWordsAccent.map((w, i) => (
            <span
              key={`h2-${i}`}
              data-word
              className="mr-3 inline-block"
              style={{ color: i === 0 ? EMERALD_DARK : undefined }}
            >
              {w}
            </span>
          ))}
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-gray-600">
          A continuously updated model of where your money is heading, built from your real transactions —
          not a chatbot guessing your balance.
        </p>
        <div className="mt-10 flex items-center gap-5">
          <Link
            href="#waitlist"
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Join the waitlist
          </Link>
          <span className="text-sm text-gray-400">Piloting at Obafemi Awolowo University</span>
        </div>
      </section>

      {/* Trajectory — the signature scroll sequence */}
      <div ref={trajectorySectionRef} className={reducedMotion ? "bg-gray-50" : "relative h-[420vh] bg-gray-50"}>
        <div
          ref={pinRef}
          className="relative flex h-screen flex-col justify-center overflow-hidden px-6 sm:px-10"
        >
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 mx-auto h-full w-full max-w-6xl opacity-90"
          >
            <path
              ref={trunkPathRef}
              d="M 0 260 C 160 240, 260 300, 340 330 C 460 370, 520 430, 620 460"
              fill="none"
              stroke={GRAY_LINE}
              strokeOpacity={reducedMotion ? 0.6 : 1}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path
              ref={branchDownRef}
              d="M 620 460 C 720 490, 820 520, 1000 560"
              fill="none"
              stroke={RED}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeOpacity={reducedMotion ? 0 : 1}
            />
            <path
              ref={branchUpRef}
              d="M 620 460 C 740 470, 840 340, 1000 220"
              fill="none"
              stroke={EMERALD}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </svg>

          <div className="relative z-10 mx-auto w-full max-w-xl">
            {beats.map((beat, i) => (
              <div
                key={beat.eyebrow}
                ref={(el) => {
                  beatRefs.current[i] = el;
                }}
                className={reducedMotion ? "mb-16 opacity-100" : "absolute inset-x-0"}
              >
                <p className="text-sm font-medium" style={{ color: EMERALD_DARK }}>
                  {beat.eyebrow}
                </p>
                <p className="mt-3 text-2xl font-medium leading-snug text-gray-900 sm:text-3xl">{beat.line}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How the Twin actually works — real content, real sequence */}
      <section id="how-it-works" className="mx-auto max-w-3xl px-6 py-28 sm:px-10">
        <p className="text-sm text-gray-500">How the Twin actually works</p>
        <h2
          className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Five parts, in order — the math comes first, the language model comes last.
        </h2>

        <ol className="mt-14 space-y-10">
          {pipeline.map((step, i) => (
            <li key={step.title} className="flex gap-6">
              <span
                className="mt-1 shrink-0 text-lg tabular-nums"
                style={{ fontFamily: "var(--font-fira-code)", color: EMERALD_DARK }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{step.title}</h3>
                <p className="mt-2 max-w-md text-gray-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section id="waitlist" className="bg-gray-50 px-6 py-24 text-center sm:px-10">
        <h2
          className="mx-auto max-w-2xl text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          See your trajectory before the month does.
        </h2>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Join the waitlist
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
          >
            Log in
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 px-6 py-10 text-center text-sm text-gray-400 sm:px-10">
        <p>Built by Team Zelta at Obafemi Awolowo University.</p>
      </footer>
    </div>
  );
}
