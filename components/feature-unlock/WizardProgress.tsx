"use client";

import { Check } from "lucide-react";

export type WizardProgressStep = {
  key: string;
  title: string;
  status: "active" | "completed" | "pending" | "skipped";
};

interface WizardProgressProps {
  steps: WizardProgressStep[];
}

export function WizardProgress({ steps }: WizardProgressProps) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const isActive = step.status === "active";
        const isCompleted = step.status === "completed";
        const isSkipped = step.status === "skipped";

        return (
          <li key={step.key} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center mt-0.5">
              {/* Step dot */}
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
                ) : isActive ? (
                  <span className="w-2 h-2 bg-white rounded-full" />
                ) : null}
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
                className={`text-[13px] font-semibold leading-tight ${
                  isActive
                    ? "text-val-heading"
                    : isCompleted
                      ? "text-emerald-700"
                      : "text-slate-400"
                }`}
              >
                {step.title}
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
