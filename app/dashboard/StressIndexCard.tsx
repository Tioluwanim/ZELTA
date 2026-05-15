"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Gauge } from "@/components/ui/LoadingWrapper";
import { CardSkeleton } from "@/components/ui/Skeleton";
import type { StressLevel } from "@/types/zelta";

interface StressIndexCardProps {
  stress_index?: number;
  stress_level?: StressLevel;
  stress_label?: string;
  bayse_primary_pct?: number;
  market_probability_pct?: number;
  loading?: boolean;
  error?: string | null;
  history?: Array<{ timestamp: string; score: number }>;
}

function safe(v: number | undefined | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : 0;
}

export default function StressIndexCard({
  stress_index,
  stress_level,
  stress_label,
  bayse_primary_pct,
  market_probability_pct,
  loading = false,
  error = null,
  history = [],
}: StressIndexCardProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return history
      .slice()
      .reverse()
      .map((item) => ({
        timestamp: new Date(item.timestamp).getTime(),
        score: item.score,
        time: new Date(item.timestamp).toLocaleTimeString(),
      }));
  }, [history]);

  /* ── Loading ── */
  if (loading) {
    return <CardSkeleton lines={6} />;
  }

  /* ── Error ── */
  if (error) {
    return (
      <Card variant="outlined" className="border-red-200 dark:border-red-800">
        <div className="flex gap-3">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">
              Error loading stress data
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  /* ── No data ── */
  if (stress_index == null) {
    return (
      <Card title="Market Stress Index" description="Waiting for market data...">
        <div className="h-40 flex items-center justify-center">
          <p className="text-gray-500 dark:text-slate-400">Connecting to market...</p>
        </div>
      </Card>
    );
  }

  const stressDisplay = safe(stress_index);
  const crowdFear = safe(bayse_primary_pct);
  const zeltaModel = safe(market_probability_pct);
  const level = stress_level ?? "CALM";

  // Color configuration per stress level
  const levelConfig = {
    CALM: {
      color: "blue",
      badge: "success",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      icon: TrendingDown,
      barColor: "#10b981",
    },
    MODERATE: {
      color: "yellow",
      badge: "info",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      icon: Minus,
      barColor: "#f59e0b",
    },
    HIGH_STRESS: {
      color: "orange",
      badge: "warning",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      icon: TrendingUp,
      barColor: "#f97316",
    },
    CRISIS: {
      color: "red",
      badge: "error",
      bg: "bg-red-50 dark:bg-red-900/20",
      icon: TrendingUp,
      barColor: "#ef4444",
    },
  };

  const config = levelConfig[level as keyof typeof levelConfig] || levelConfig.CALM;
  const Icon = config.icon;

  const trend =
    chartData.length > 1 && chartData[chartData.length - 1].score > chartData[0].score
      ? "up"
      : "down";

  return (
    <Card className={config.bg} variant="elevated">
      <div className="space-y-6">
        {/* Header with gauge */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Market Stress Index
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Real-time market emotion
            </p>
          </div>
          <Icon
            className={
              config.color === "blue"
                ? "text-blue-500"
                : config.color === "yellow"
                  ? "text-yellow-500"
                  : config.color === "orange"
                    ? "text-orange-500"
                    : "text-red-500"
            }
            size={24}
          />
        </div>

        {/* Main display */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="text-5xl font-bold text-gray-900 dark:text-white">
              {stressDisplay}
              <span className="text-xl font-normal text-gray-500 dark:text-slate-400">
                /100
              </span>
            </div>
            <Badge
              label={level}
              variant={config.badge as any}
              size="md"
              className="mt-2"
            />
          </div>

          <div className="flex-1 flex justify-center">
            <Gauge
              value={stressDisplay}
              color={config.color as any}
              size="md"
              label={level}
            />
          </div>
        </div>

        {/* Trend indicator */}
        <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg">
          {trend === "up" ? (
            <TrendingUp size={16} className="text-red-500" />
          ) : (
            <TrendingDown size={16} className="text-green-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-slate-300">
            Stress is <strong>{trend === "up" ? "increasing" : "decreasing"}</strong>
          </span>
        </div>

        {/* Mini chart if history available */}
        {chartData.length > 1 && (
          <div className="h-32 rounded-lg bg-white dark:bg-slate-800 p-4 border border-gray-200 dark:border-slate-700">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.barColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={config.barColor} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "#f3f4f6" }}
                  formatter={(value: number) => [`${Math.round(value)}%`, "Stress"]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={config.barColor}
                  fillOpacity={1}
                  fill="url(#stressGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Component breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">
              Bayse (Market Fear)
            </p>
            <p className="text-2xl font-bold text-orange-500">{crowdFear}%</p>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Crowd prediction signal
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">
              ZELTA (Rational)
            </p>
            <p className="text-2xl font-bold text-emerald-500">{zeltaModel}%</p>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Model probability
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
            <span>Overall Level</span>
            <span className="font-medium">{stressDisplay}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${stressDisplay}%`, backgroundColor: config.barColor }}
            />
          </div>
        </div>

        {/* Info */}
        {stress_label && (
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            {stress_label}
          </p>
        )}

        {/* Alert if crisis */}
        {level === "CRISIS" && (
          <div className="flex gap-2 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700">
            <AlertTriangle
              size={16}
              className="text-red-600 dark:text-red-400 shrink-0 mt-0.5"
            />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              Market in crisis. Consider locking funds or reducing exposure.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}