"use client";
import Link from "next/link";
import Zel, { type Mood } from "./Zel";

const base = "btn inline-flex items-center justify-center gap-2 rounded-[14px] px-5 font-display font-bold min-h-12 disabled:opacity-50 disabled:cursor-not-allowed select-none text-[17px]";
const variants = {
  primary: "bg-indigo text-white",
  reward: "bg-danfo text-ink",
  quiet: "bg-paper text-indigo border-[1.5px] border-line",
  danger: "bg-coral text-white",
} as const;
type Variant = keyof typeof variants;

export function Button({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...p} className={`${base} ${variants[variant]} ${className}`} />;
}
export function LinkButton({ href, variant = "primary", className = "", children }: { href: string; variant?: Variant; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={`${base} ${variants[variant]} ${className}`}>{children}</Link>;
}

export function Card({ className = "", children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={`relative overflow-hidden rounded-[22px] bg-paper border-[1.5px] border-line p-5 pt-6 ${className}`}><span aria-hidden className="hem absolute inset-x-3 top-1.5 h-2" />{children}</div>;
}

export function Pill({ tone = "indigo", children }: { tone?: "indigo" | "mint" | "coral" | "danfo"; children: React.ReactNode }) {
  const t = { indigo: "bg-indigo-tint text-indigo", mint: "bg-mint-tint text-mint-deep", coral: "bg-coral-tint text-coral-deep", danfo: "bg-danfo-tint text-ink" }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${t}`}>{children}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-line/70 ${className}`} />;
}

export function Notice({ mood = "worried", title, children, action }: { mood?: Mood; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center text-center gap-2 py-8" role="status">
      <Zel mood={mood} size={84} />
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <p className="text-soft max-w-sm">{children}</p>}
      {action}
    </Card>
  );
}

export function Ring({ value, size = 120, stroke = 12, tone = "var(--mint)", children }: { value: number; size?: number; stroke?: number; tone?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="absolute text-center">{children}</div>
    </div>
  );
}
