import { Brain, CheckCircle } from "lucide-react";

interface BiasCardProps {
  bias_explanation?: string;
  bias_confidence?: string;
  active_bias?: string;
  loading?: boolean;
  error?: string | null;
}

// Backend BiasSchema defaults active_bias to "Rational" when no bias detected.
// "Rational" means the user is making logical decisions — show a positive state.
const RATIONAL_BIASES = ["Rational", "NONE", "None", "rational", "none"];

export default function BiasAlertCard({
  bias_explanation,
  active_bias,
  loading = false,
  error = null,
}: BiasCardProps) {
  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex gap-4 p-5 bg-gray-100 rounded-xl animate-pulse">
        <div className="w-6 h-6 bg-gray-300 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-32" />
          <div className="h-6 bg-gray-300 rounded w-40" />
          <div className="h-4 bg-gray-300 rounded" />
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex gap-4 p-5 bg-white rounded-xl border border-red-200">
        <Brain color="red" />
        <p className="text-red-600 text-sm">Failed to load bias data: {error}</p>
      </div>
    );
  }

  const isRational = !active_bias || RATIONAL_BIASES.includes(active_bias);

  /* ── Rational / no active bias — positive state ── */
  if (isRational) {
    return (
      <div className="flex gap-4 p-5 bg-emerald-50 rounded-xl border border-emerald-100">
        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={22} />
        <div>
          <p className="font-semibold text-sm text-emerald-700">No Active Bias</p>
          <h2 className="text-lg font-bold text-emerald-600">Rational</h2>
          <p className="text-sm text-gray-600 mt-1">
            {bias_explanation && bias_explanation.trim()
              ? bias_explanation
              : "Market appears stable. Your decisions are tracking the data well."}
          </p>
        </div>
      </div>
    );
  }

  /* ── Active cognitive bias detected ── */
  const bgColor =
    active_bias?.includes("CRISIS") || active_bias?.includes("Loss")
      ? "bg-red-50 border-red-100"
      : "bg-orange-50 border-orange-100";
  const headingColor =
    active_bias?.includes("CRISIS") || active_bias?.includes("Loss")
      ? "text-red-500"
      : "text-orange-500";

  return (
    <div className={`flex gap-4 p-5 rounded-xl border ${bgColor}`}>
      <Brain className={`shrink-0 mt-0.5 ${headingColor}`} size={22} />
      <div>
        <p className="font-semibold text-sm">Active Bias Detected</p>
        <h2 className={`text-xl font-bold uppercase ${headingColor}`}>
          {active_bias}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {bias_explanation?.trim() ||
            "A cognitive bias is influencing your decisions. Review before acting."}
        </p>
      </div>
    </div>
  );
}