"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "#top" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Future Lab", href: "#waitlist" },
];

export default function FloatingNav() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Simplified to only track if the user has scrolled past 8px 
  // to toggle the drop shadow effect.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }} // Always stays at y: 0 (fixed)
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="flex items-center gap-2">
        {/* Main pill: brand + links */}
        <nav
          onMouseLeave={() => setHovered(null)}
          className={`flex items-center gap-1 rounded-full bg-gray-900/95 pl-5 pr-2 py-2 backdrop-blur transition-shadow duration-300 ${
            scrolled ? "shadow-lg shadow-gray-900/20" : "shadow-md shadow-gray-900/10"
          }`}
        >
          <Link
            href="/"
            className="mr-3 text-sm font-semibold tracking-tight text-white"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            ZELTA
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHovered(item.href)}
                className="relative rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {hovered === item.href && (
                  <motion.span
                    layoutId="nav-hover-pill"
                    className="absolute inset-0 rounded-full bg-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white sm:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </nav>

        {/* CTA */}
        <Link
          href="/sign-up"
          className="hidden shrink-0 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-400 sm:block"
        >
          Get started
        </Link>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-4 right-4 top-16 rounded-2xl bg-gray-900/95 p-3 shadow-lg backdrop-blur sm:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/sign-up"
              onClick={() => setMobileOpen(false)}
              className="mt-1 block rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              Get started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
