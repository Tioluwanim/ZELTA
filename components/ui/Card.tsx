import React from "react";
import { clsx } from "clsx";
import type { CardProps } from "@/types/zelta";

/**
 * Reusable Card component with dark-mode support
 * Foundation for dashboard cards, modals, and content containers
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  CardProps & { children: React.ReactNode }
>(
  (
    {
      title,
      description,
      children,
      className,
      variant = "default",
      isDarkMode = true,
    },
    ref
  ) => {
    const baseClasses = clsx(
      "rounded-lg transition-all duration-200 ease-out",
      {
        // Default: elevated card
        "default bg-white dark:bg-slate-900 shadow-sm dark:shadow-lg border border-gray-200 dark:border-slate-700":
          variant === "default",
        // Elevated: more shadow
        "elevated bg-white dark:bg-slate-900 shadow-lg dark:shadow-2xl border border-gray-100 dark:border-slate-700":
          variant === "elevated",
        // Outlined: no fill, just border
        "outlined bg-transparent border-2 border-gray-300 dark:border-slate-600":
          variant === "outlined",
      }
    );

    return (
      <div ref={ref} className={clsx(baseClasses, className)}>
        {/* Header */}
        {(title || description) && (
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className={title || description ? "px-6 py-4" : ""}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = "Card";
