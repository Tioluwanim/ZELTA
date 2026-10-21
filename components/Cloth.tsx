"use client";
import { kobo } from "@/lib/format";
import type { Twin } from "@/lib/types";

/** The balance as a strip of adire cloth. Each band is a different resist pattern, so it reads without colour: stitched = bills, tied rings = free money, diamonds = cushion. */
export function ClothStrip({ position }: { position: NonNullable<Twin["position"]> }) {
  const total = position.total_connected_money?.minor ?? 0;
  const bills = Math.max(0, position.bills_due_in_horizon?.minor ?? 0);
  const cushion = Math.max(0, Math.min(position.cushion?.minor ?? 0, Math.max(0, total - bills)));
  const free = Math.max(0, total - bills - cushion);
  const parts = [
    { key: "bills", label: "Bills coming", value: bills, pat: "alabere", bg: "var(--dye-4)" },
    { key: "cushion", label: "Cushion", value: cushion, pat: "batani", bg: "var(--dye-2)" },
    { key: "free", label: "Free to use", value: free, pat: "oniko", bg: "var(--dye-1)" },
  ].filter((p) => p.value > 0);
  const sum = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-16 gap-1 overflow-hidden rounded-2xl" role="img"
        aria-label={parts.map((p) => `${p.label} ${kobo({ minor: p.value })}`).join(", ")}>
        {parts.map((p, i) => (
          <div key={p.key} className={`cloth ${p.pat} dip`} style={{ width: `${(p.value / sum) * 100}%`, background: p.bg, animationDelay: `${i * 140}ms`, ["--stitch" as string]: "rgba(245,239,226,.38)" }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2 text-[15px]">
            <span aria-hidden className={`cloth ${p.pat} inline-block h-4 w-7 rounded`} style={{ background: p.bg, ["--stitch" as string]: "rgba(245,239,226,.5)", ["--size" as string]: "14px" }} />
            <span className="text-soft">{p.label}</span> <strong className="num">{kobo({ minor: p.value })}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 28 days of spending as squares of cloth: the deeper the dye, the more spent that day. Rest days stay undyed. */
export function SpendingCloth({ series }: { series: { date: string; minor: number }[] }) {
  const max = Math.max(1, ...series.map((d) => d.minor));
  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const shade = ["transparent", "#b9bbea", "#7f84cf", "#4a4fb0", "#1c1f66"];
  const total = series.reduce((a, d) => a + d.minor, 0);
  const quiet = series.filter((d) => d.minor === 0).length;
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5" role="img" aria-label={`Spending over the last ${series.length} days: ${kobo({ minor: total })} in total, ${quiet} days with no spending.`}>
        {series.map((d, i) => {
          const l = level(d.minor);
          return <div key={d.date} title={`${new Date(d.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}: ${kobo({ minor: d.minor })}`}
            className="dip-y aspect-square rounded-[7px]" style={{ animationDelay: `${i * 18}ms`, background: shade[l], border: l === 0 ? "1.5px dashed var(--line)" : "1.5px solid transparent" }} />;
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-soft" aria-hidden>
        <span>Oldest</span>
        <span className="flex items-center gap-1">Less {shade.slice(1).map((c) => <i key={c} className="inline-block h-3 w-3 rounded-[4px]" style={{ background: c }} />)} More</span>
        <span>Yesterday</span>
      </div>
    </div>
  );
}
