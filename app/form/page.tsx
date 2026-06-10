"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { apiFetch } from "@/hooks/useFetch";

interface FormSection {
  id: number;
  heading: string;
  options: string[];
}

const formSections: FormSection[] = [
  {
    id: 0,
    heading: "Available Capital",
    options: ["₦0 - ₦10,000", "₦10,000 - ₦50,000", "₦50,000+"],
  },
  {
    id: 1,
    heading: "Risk Preference",
    options: ["Conservative", "Moderate", "Aggressive"],
  },
  {
    id: 2,
    heading: "Primary Goal",
    options: ["Build savings", "Generate Income", "Grow Wealth"],
  },
];

const RISK_MAP: Record<string, "low" | "moderate" | "high"> = {
  Conservative: "low",
  Moderate: "moderate",
  Aggressive: "high",
};

export default function Page() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (sectionId: number, option: string) => {
    setSelectedOptions((prev) => ({ ...prev, [sectionId]: option }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedOptions[0] || !selectedOptions[1] || !selectedOptions[2]) {
      setError("Please complete all sections before continuing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim() || undefined,
          financial: {
            capital_range: selectedOptions[0],
            risk_tolerance: RISK_MAP[selectedOptions[1]] ?? "moderate",
            next_exam_date: examDate || undefined,
          },
          preferences: {
            primary_goal: selectedOptions[2],
          },
        }),
      });
    } catch (err) {
      console.warn("[Form] Profile save failed, continuing...");
    } finally {
      setSubmitting(false);

      // ✅ IMPORTANT FIXES
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh(); // forces middleware re-check
      }, 150); // small delay for cookie/session sync
    }
  };

  return (
    <section className="mx-auto min-h-screen w-[90%] space-y-5 md:w-[40%] lg:w-[30%]">
      <div className="mt-4 p-3 text-center">
        <h2 className="pb-1 text-[22px] font-bold text-[#10b981] lg:text-[26px]">
          ZELTA
        </h2>
        <p className="text-[14px] tracking-wide lg:text-base">
          Let&apos;s get to know you
        </p>
      </div>

      <form className="w-full text-start" onSubmit={handleSubmit}>
        <div className="mb-4">
          <h4 className="mb-1 font-semibold">Your Name</h4>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-xl border border-gray-300 bg-transparent px-6 py-2 focus:border-green-500 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <h4 className="mb-1 font-semibold">Next Exam Date <span className="text-xs font-normal text-gray-400">(optional — activates ZELTA exam protection)</span></h4>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-gray-300 bg-transparent px-6 py-2 focus:border-green-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">ZELTA reduces your spending limit as exams approach (λt modifier)</p>
        </div>

        {formSections.map((section) => (
          <div key={section.id} className="mb-4">
            <h3 className="mb-1 text-[14px] font-semibold lg:text-base">
              {section.heading}
            </h3>
            {section.heading === "Risk Preference" && (
              <p className="mb-2 text-xs text-gray-500">
                Conservative: protect money first. Moderate: balanced growth. Aggressive: higher risk for higher upside.
              </p>
            )}

            <ul className="flex w-full flex-col gap-2.5 text-[14px] font-medium">
              {section.options.map((option) => {
                const isActive = selectedOptions[section.id] === option;

                return (
                  <li
                    key={option}
                    role="button"
                    tabIndex={0}
                    aria-label={`${section.heading}: ${option}`}
                    aria-pressed={isActive}
                    onClick={() => handleSelect(section.id, option)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelect(section.id, option);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border px-6 py-2 transition ${
                      isActive
                        ? "border-green-500 bg-green-50 font-semibold text-green-700"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    {option}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          className="mb-4 w-full rounded-xl bg-[#10b981] p-2 text-white disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Continue to Dashboard"}
        </Button>
      </form>
    </section>
  );
}