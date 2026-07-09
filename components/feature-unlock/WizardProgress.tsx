"use client";

import type { ComponentType } from "react";
import { Check } from "lucide-react";

export type WizardProgressStep = {
  key: string;
  title: string;
  status: "active" | "completed" | "pending" | "skipped";
  // Optional: flags a step whose fields failed validation (e.g. after a failed Save in a
  // free-navigation form). Renders a small error dot next to the label.
  hasError?: boolean;
  // Optional: shown next to the label in nav-button mode (onSelect present) only — mirrors
  // the icon+label nav rows used on /settings.
  icon?: ComponentType<{ className?: string }>;
};

interface WizardProgressProps {
  steps: WizardProgressStep[];
  // Optional: when provided, renders flat nav buttons that jump directly to a section (used by
  // free-navigation forms). Absent → a read-only numbered stepper for true linear wizards.
  onSelect?: (key: string, index: number) => void;
}

export function WizardProgress({ steps, onSelect }: WizardProgressProps) {
  // Free navigation (onSelect present) means there's no real sequential order to show
  // progress through — render flat nav buttons to a section instead of a numbered stepper.
  if (onSelect) {
    return (
      <nav className="flex flex-col gap-0.5">
        {steps.map((step, i) => {
          const isActive = step.status === "active";
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onSelect(step.key, i)}
              aria-current={isActive ? "page" : undefined}
              className={`text-left rounded-lg px-3 py-2 text-[13px] font-semibold flex items-center gap-2.5 transition-colors ${
                step.hasError
                  ? "text-rose-600"
                  : isActive
                    ? "bg-white text-val-heading shadow-sm border border-slate-200"
                    : "text-slate-500 hover:bg-slate-100/70 hover:text-val-heading"
              }`}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span className="flex items-center gap-1.5">
                {step.title}
                {step.hasError && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-label="has errors" />
                )}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const isActive = step.status === "active";
        const isCompleted = step.status === "completed";
        const isSkipped = step.status === "skipped";

        return (
          <li key={step.key} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center mt-0.5">
              {/* Step marker — number by default, checkmark once completed. Numbering gives
                  the rail a sense of total steps and position, not just a bare progress dot. */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500"
                    : isActive
                      ? "bg-[var(--val-primary-dark)]"
                      : isSkipped
                        ? "bg-slate-200"
                        : "bg-slate-100 border border-slate-200"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                ) : (
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className={`w-px mt-1 mb-0.5 ${
                    isCompleted ? "bg-emerald-200" : "bg-slate-100"
                  }`}
                  style={{ minHeight: 20 }}
                />
              )}
            </div>

            {/* Step label */}
            <div className="pb-4 pt-0">
              <p
                className={`text-[13px] font-semibold leading-tight flex items-center gap-1.5 ${
                  step.hasError
                    ? "text-rose-600"
                    : isActive
                      ? "text-val-heading"
                      : isCompleted
                        ? "text-emerald-700"
                        : "text-slate-400"
                }`}
              >
                {step.title}
                {step.hasError && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-label="has errors" />
                )}
              </p>
              {isSkipped && (
                <span className="mt-0.5 inline-block text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Skipped
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
