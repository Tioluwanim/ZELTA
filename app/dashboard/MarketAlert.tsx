import { Activity, TrendingDown, TrendingUp } from "lucide-react";

interface MarketAlertProps {
  crowd_yes_pct?: number;
  bayse_market?: string;
  loading?: boolean;
  error?: string | null;
}

export default function MarketAlert({ crowd_yes_pct, bayse_market, loading }: MarketAlertProps) {
  if (loading) {
    return <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />;
  }

  const fearPct = Math.min(100, Math.max(0, Math.round(crowd_yes_pct ?? 0)));
  const market  = bayse_market || "Nigerian Financial Market";
  const calmPct = 100 - fearPct;

  const isHighFear = fearPct >= 60;
  const isMidFear  = fearPct >= 35;

  const wrapColor  = isHighFear ? "border-red-200 bg-red-50"
    : isMidFear ? "border-amber-200 bg-amber-50"
    : "border-emerald-200 bg-emerald-50";

  const fearColor  = isHighFear ? "text-red-600" : isMidFear ? "text-amber-600" : "text-emerald-600";
  const calmColor  = isHighFear ? "text-gray-500" : isMidFear ? "text-gray-500" : "text-emerald-700";
  const label      = isHighFear ? "High Panic" : isMidFear ? "Moderate" : "Calm";
  const barFear    = isHighFear ? "bg-red-400" : isMidFear ? "bg-amber-400" : "bg-emerald-400";
  const Icon       = isHighFear ? TrendingUp : TrendingDown;
  const iconColor  = isHighFear ? "text-red-500" : isMidFear ? "text-amber-500" : "text-emerald-500";

  return (
    <div className={`rounded-2xl border p-4 ${wrapColor}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 shrink-0 ${iconColor}`} />
          <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{market}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
          isHighFear ? "bg-red-100 text-red-700 border-red-200"
          : isMidFear ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-emerald-100 text-emerald-700 border-emerald-200"
        }`}>{label}</span>
      </div>

      {/* Fear / Calm pair */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Market Fear (Bayse)</p>
          <p className={`text-2xl font-bold ${fearColor}`}>{fearPct}%</p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/60">
            <div className={`h-1.5 rounded-full transition-all ${barFear}`} style={{ width: `${fearPct}%` }} />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Calm Signal (ZELTA)</p>
          <p className={`text-2xl font-bold ${calmColor}`}>{calmPct}%</p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/60">
            <div className="h-1.5 rounded-full bg-emerald-400 transition-all" style={{ width: `${calmPct}%` }} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
        Bayse reads crowd emotion in the Nigerian financial market — not personal stress.{" "}
        {fearPct >= 60
          ? "High panic detected. Wait before making big money moves."
          : fearPct >= 35
            ? "Moderate tension. Stay cautious with spending."
            : "Market is calm. A good time to plan ahead."}
      </p>
    </div>
  );
}