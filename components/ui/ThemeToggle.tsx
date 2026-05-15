"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/**
 * Theme toggle button for dark/light mode switching
 */
export const ThemeToggle: React.FC = () => {
  const { mode, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors duration-200"
      title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      aria-label="Toggle theme"
    >
      {mode === "dark" ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-gray-700" />
      )}
    </button>
  );
};

ThemeToggle.displayName = "ThemeToggle";
