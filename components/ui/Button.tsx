import React from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Enhanced Button component with dark mode support
 * Supports variants, sizes, loading state
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      icon,
      fullWidth = false,
      className,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm rounded-md",
      md: "px-4 py-2 text-base rounded-lg",
      lg: "px-6 py-3 text-lg rounded-lg",
    };

    const variantClasses = {
      primary:
        "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-700",
      secondary:
        "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600",
      outline:
        "border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800/50",
      ghost:
        "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/50",
      danger:
        "bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800",
    };

    const disabledClasses =
      "opacity-50 cursor-not-allowed hover:bg-current active:bg-current";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-95",
          sizeClasses[size],
          variantClasses[variant],
          disabled || isLoading ? disabledClasses : "",
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="animate-spin" size={18} /> : icon}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
