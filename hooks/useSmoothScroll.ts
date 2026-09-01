"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";

/**
 * Wires Lenis' physics-based smooth scroll into GSAP's ticker so
 * ScrollTrigger stays perfectly in sync with the scroll position.
 * No-ops entirely when the visitor has requested reduced motion —
 * native scroll behaviour is left untouched in that case.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
    }

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}

export function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
