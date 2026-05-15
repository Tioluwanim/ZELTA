import React from "react";
import { clsx } from "clsx";
import type { BadgeProps } from "@/types/zelta";

/**
 * Status/label badge with variant support
 * Used for verdicts, stress levels, bias states, etc.
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  variant,
  size = "md",
  icon,
  onClick,
}) => {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const variantClasses = {
    success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700",
    warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700",
    error: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700",
    info: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700",
    neutral: "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-300 dark:border-slate-600",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-200",
        sizeClasses[size],
        variantClasses[variant],
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </div>
  );
};

Badge.displayName = "Badge";
