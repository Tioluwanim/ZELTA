"use client";
import Link from "next/link";
import {
  Home,
  Wallet,
  Brain,
  Sparkles,
  MessageSquare,
  History,
} from "lucide-react";
import { usePathname } from "next/navigation";

// Profile and History are accessible from the header avatar dropdown.
// The sidebar only carries the 5 primary sections.
const NAV_ITEMS = [
  { icon: Home,          label: "Home",       href: "/dashboard" },
  { icon: Wallet,        label: "Wallet",     href: "/dashboard/wallet" },
  { icon: Brain,         label: "Behavioral", href: "/dashboard/behavioral" },
  { icon: Sparkles,      label: "Simulation", href: "/dashboard/simulations" },
  { icon: MessageSquare, label: "Co-pilot",   href: "/dashboard/co-pilot" },
  { icon: History,       label: "History",    href: "/dashboard/history" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col h-full px-4 py-6 gap-6">
        {/* Brand */}
        <div className="px-2">
          <p className="text-xl font-bold text-[#10b981] tracking-tight">ZELTA</p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide uppercase">
            Financial Intelligence
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#10b981] text-white shadow-sm"
                    : "text-slate-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-gray-700"
                  }`}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span>{label}</span>

                {/* Active indicator dot */}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer hint */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1">Tip</p>
          Profile and Decision History are available from the avatar menu at the top right.
        </div>
      </aside>

      {/* ── Mobile bottom bar ───────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-100 bg-white px-2 py-1 safe-pb">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all ${
                active ? "text-[#10b981]" : "text-slate-400"
              }`}
            >
              {/* Active: filled pill background */}
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                  active ? "bg-emerald-50" : ""
                }`}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </span>
              <span
                className={`text-[10px] font-medium leading-none ${
                  active ? "text-[#10b981]" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}