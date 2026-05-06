import { Activity } from "lucide-react";

interface MarketAlertProps {
  // Accept pre-normalised 0-100 percentage — no conversion done here
  crowd_yes_pct?: number;
  bayse_market?: string;
  loading?: boolean;
  error?: string | null;
}

export default function MarketAlert({ crowd_yes_pct, bayse_market, loading }: MarketAlertProps) {
  if (loading) {
    return <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />;
  }

  // Clamp to 0-100 just in case
  const fearPct = Math.min(100, Math.max(0, Math.round(crowd_yes_pct ?? 0)));
  const market = bayse_market || "Bayse Market";

  const color =
    fearPct >= 70 ? "bg-red-50 text-red-700 border-red-200"
    : fearPct >= 40 ? "bg-orange-50 text-orange-700 border-orange-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const iconColor = fearPct >= 70 ? "red" : fearPct >= 40 ? "orange" : "green";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${color}`}>
      <Activity color={iconColor} size={18} className="shrink-0" />
      <p className="font-medium">
        {market} — <span className="font-bold">{fearPct}% crowd fear</span>
      </p>
    </div>
  );
}