import React from "react";
import { clsx } from "clsx";
import type { SkeletonConfig } from "@/types/zelta";

/**
 * Skeleton loader for loading states
 * Provides visual feedback while data is being fetched
 */
export const Skeleton: React.FC<SkeletonConfig> = ({
  rows = 3,
  height = "md",
  width = "full",
  variant = "pulse",
}) => {
  const heightClasses = {
    sm: "h-3",
    md: "h-4",
    lg: "h-6",
  };

  const widthClasses = {
    full: "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
  };

  const animationClasses = {
    pulse: "animate-pulse bg-gray-200 dark:bg-slate-700",
    wave: "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%]",
  };

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "rounded-md",
            heightClasses[height],
            widthClasses[width],
            animationClasses[variant]
          )}
        />
      ))}
    </div>
  );
};

Skeleton.displayName = "Skeleton";

/**
 * Card skeleton for card-shaped loading state
 */
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 4 }) => {
  return (
    <div className="space-y-4 p-6 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
      {/* Header skeleton */}
      <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />

      {/* Content skeleton */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              "h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse",
              i === lines - 1 ? "w-2/3" : "w-full"
            )}
          />
        ))}
      </div>
    </div>
  );
};

CardSkeleton.displayName = "CardSkeleton";

/**
 * Chart skeleton for chart loading states
 */
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-6 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
      {/* Title */}
      <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />

      {/* Chart area */}
      <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded animate-pulse" />

      {/* Legend */}
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
};

ChartSkeleton.displayName = "ChartSkeleton";
