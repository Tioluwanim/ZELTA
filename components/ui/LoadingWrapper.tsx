import React from "react";
import { clsx } from "clsx";
import { CardSkeleton } from "./Skeleton";

interface LoadingWrapperProps {
  isLoading: boolean;
  error?: string | null;
  children: React.ReactNode;
  skeletonType?: "card" | "text" | "chart";
}

/**
 * Wrapper component for loading and error states
 * Handles skeleton display and error messaging
 */
export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  error,
  children,
  skeletonType = "card",
}) => {
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">
          Error loading data
        </p>
        <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return <CardSkeleton lines={4} />;
  }

  return <>{children}</>;
};

LoadingWrapper.displayName = "LoadingWrapper";

/**
 * Gauge chart for displaying scores (0-100)
 */
interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  color?: "blue" | "green" | "yellow" | "red";
  size?: "sm" | "md" | "lg";
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  color = "blue",
  size = "md",
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const colorClasses = {
    blue: "from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700",
    green: "from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700",
    yellow: "from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700",
    red: "from-red-400 to-red-600 dark:from-red-500 dark:to-red-700",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={clsx("relative", sizeClasses[size])}>
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background arc */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200 dark:text-slate-700"
          />

          {/* Progress arc */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeDasharray={`${3.14159 * 100 * (percentage / 100)} ${
              3.14159 * 100
            }`}
            strokeLinecap="round"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                className={clsx("text-opacity-70", {
                  "text-blue-400": color === "blue",
                  "text-green-400": color === "green",
                  "text-yellow-400": color === "yellow",
                  "text-red-400": color === "red",
                })}
              />
              <stop
                offset="100%"
                className={clsx({
                  "text-blue-600": color === "blue",
                  "text-green-600": color === "green",
                  "text-yellow-600": color === "yellow",
                  "text-red-600": color === "red",
                })}
              />
            </linearGradient>
          </defs>
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(value)}
          </span>
          {label && (
            <span className="text-xs text-gray-600 dark:text-slate-400">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

Gauge.displayName = "Gauge";
