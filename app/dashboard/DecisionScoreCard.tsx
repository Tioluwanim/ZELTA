import { Brain } from "lucide-react";

interface DecisionScoreCardProps {
  confidence_gap?: number;      // 0-100 integer from backend
  bias_confidence?: string;     // "Low" | "Medium" | "High" urgency label
  rational_pct?: number;        // 0-100 integer from backend
  behavioral_pct?: number;      // 0-100 integer from backend
  loading?: boolean;
  error?: string | null;
}

export default function DecisionScoreCard({
  confidence_gap,
  bias_confidence,
  rational_pct,
  behavioral_pct,
  loading = false,
  error = null,
}: DecisionScoreCardProps) {
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm animate-pulse">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-5 w-5 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded" />
        </div>
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm">
        <p className="text-red-600 text-sm">Failed to load decision data: {error}</p>
      </div>
    );
  }

  if (confidence_gap === undefined || confidence_gap === null) {
    return (
      <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="font-bold uppercase text-sm">Decision Confidence Score</p>
          <Brain className="h-5 w-5 text-gray-300" />
        </div>
        <p className="text-gray-400 text-sm">Loading confidence analysis...</p>
      </div>
    );
  }

  // rational_pct and behavioral_pct are already 0-100 integers from the backend.
  // confidence_gap is also a 0-100 integer (abs diff between rational and behavioral).
  const rPct = Math.round(Math.min(100, Math.max(0, rational_pct ?? 0)));
  const bPct = Math.round(Math.min(100, Math.max(0, behavioral_pct ?? 0)));
  const gap  = Math.round(Math.min(100, Math.max(0, confidence_gap ?? 0)));

  const urgencyBg =
    gap >= 40 ? "bg-red-50 text-red-700 border-red-100"
    : gap >= 20 ? "bg-amber-50 text-amber-700 border-amber-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <div className="bg-white p-5 rounded-xl space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <p className="font-bold uppercase text-sm">Decision Confidence Score</p>
        <Brain className="h-5 w-5 text-gray-400" />
      </div>

      <Bar label="Rational" value={rPct} color="green" />
      <Bar label="Behavioral (Impulse)" value={bPct} color="orange" />

      <div className={`border rounded-xl px-4 py-3 text-sm ${urgencyBg}`}>
        <strong>Confidence Gap: {gap}%</strong>
        {bias_confidence && (
          <span className="ml-1 opacity-80">— {bias_confidence} urgency</span>
        )}
      </div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: "green" | "orange" }) {
  const barClass = color === "green" ? "bg-emerald-500" : "bg-orange-400";
  const textClass = color === "green" ? "text-emerald-600" : "text-orange-500";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className={`font-semibold ${textClass}`}>{value}%</span>
      </div>
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}