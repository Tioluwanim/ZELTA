"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoothScroll, usePrefersReducedMotion } from "@/hooks/useSmoothScroll";
import FloatingNav from "@/components/FloatingNav";
import ScrollProgress from "@/components/ScrollProgress";
import FutureLabPreview from "@/components/FutureLabPreview";
import MagneticButton from "@/components/MagneticButton";

// Matches the app's own tokens
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
    line: "The Twin sees the bend before you do. Deterministic math catches the dip\u2014not a guessing language model.",
  },
  {
    eyebrow: "Before you spend",
    line: "\u201CWhat if I buy this laptop now?\u201D Run it through the Future Lab and see the trajectory change before you commit.",
  },
  {
    eyebrow: "When the gap is real",
    line: "Insight turns into action. The Opportunity Engine matches your shortfall to legitimate, skill-fit gigs.",
  },
];

const pipeline = [
  {
    title: "Deterministic engine",
    body: "Cash-flow math on your actual balance and obligations. No language model touches the numbers.",
  },
  {
    title: "Statistical forecasting",
    body: "Trend and seasonality drawn from real transaction history, pulled securely through Mono.",
  },
  {
    title: "Plain-language narration",
    body: "An LLM explains what the math already found. It narrates the result\u2014it doesn't invent it.",
  },
  {
    title: "Future Lab",
    body: "Simulate a big decision against your real financial trajectory before you actually make it.",
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

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
  }, []);

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

      tl.to(trunk, { strokeDashoffset: 0, ease: "none", duration: 4 }, 0);
      tl.to(branchDown, { strokeDashoffset: 0, ease: "none", duration: 2 }, 4);
      tl.to(branchUp, { strokeDashoffset: 0, ease: "none", duration: 2 }, 4);
      tl.to(branchDown, { opacity: 0.15, duration: 1 }, 6);
      tl.to(branchUp, { opacity: 1, duration: 1 }, 6);

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
      <ScrollProgress />
      <FloatingNav />

      <section ref={heroRef} className="relative mx-auto max-w-6xl px-6 pb-32 pt-28 sm:px-10 sm:pt-40">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Built for Nigerian university students
        </p>
        <h1
          className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] text-gray-900 sm:text-6xl md:text-7xl"
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
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-gray-600">
          A continuously updated model of where your money is heading, built from your real transactions
          \u2014 not a chatbot guessing your balance.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <MagneticButton
            href="#waitlist"
            className="rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 hover:shadow-emerald-500/30"
          >
            Join the waitlist
          </MagneticButton>
          <span className="text-sm font-medium text-gray-400">Piloting at OAU</span>
        </div>
      </section>

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
              strokeWidth={4}
              strokeLinecap="round"
            />
            <path
              ref={branchDownRef}
              d="M 620 460 C 720 490, 820 520, 1000 560"
              fill="none"
              stroke={RED}
              strokeWidth={3}
              strokeLinecap="round"
              strokeOpacity={reducedMotion ? 0 : 1}
            />
            <path
              ref={branchUpRef}
              d="M 620 460 C 740 470, 840 340, 1000 220"
              fill="none"
              stroke={EMERALD}
              strokeWidth={4}
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
                <span
                  className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-wide"
                  style={{ color: EMERALD_DARK }}
                >
                  {beat.eyebrow}
                </span>
                <p className="mt-4 text-3xl font-medium leading-[1.3] text-gray-900 sm:text-4xl">
                  {beat.line}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Try it yourself \u2014 direct manipulation, immediate feedback */}
      <section className="mx-auto max-w-3xl px-6 py-24 sm:px-10">
        <FutureLabPreview />
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-32 sm:px-10 sm:py-40">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Architecture</p>
          <h2
            className="mt-4 text-3xl font-semibold leading-tight text-gray-900 sm:text-5xl"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Math first. <br className="hidden sm:block" /> Language model last.
          </h2>
          <p className="mt-6 text-lg text-gray-600">
            A deterministic pipeline that builds a picture of your financial future, step by step.
          </p>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pipeline.map((step, i) => (
            <div
              key={step.title}
              className={`flex flex-col justify-between rounded-3xl border border-gray-100 bg-gray-50/50 p-8 transition-shadow hover:shadow-md hover:shadow-gray-900/5 ${
                i === 3 || i === 4 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div>
                <span
                  className="mb-6 block text-3xl font-light tabular-nums"
                  style={{ fontFamily: "var(--font-space-grotesk)", color: EMERALD }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-gray-600">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="waitlist" className="bg-gray-900 px-6 py-32 text-center sm:px-10 sm:py-40">
        <h2
          className="mx-auto max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          See your trajectory before the month does.
        </h2>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <MagneticButton
            href="/sign-up"
            className="rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400 hover:shadow-emerald-500/20"
          >
            Join the waitlist
          </MagneticButton>
          <Link
            href="/login"
            className="rounded-full border border-gray-700 bg-gray-800/50 px-8 py-4 text-sm font-semibold text-gray-200 transition hover:bg-gray-800 hover:text-white"
          >
            Log in to account
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 px-6 py-12 text-center text-sm text-gray-500 sm:px-10">
        <p>Built by Team Zelta at Obafemi Awolowo University.</p>
      </footer>
    </div>
  );
}
