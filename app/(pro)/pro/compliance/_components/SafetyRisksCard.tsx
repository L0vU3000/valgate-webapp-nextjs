"use client";

import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EnterLi } from "@/app/(pro)/pro/_components/motion-primitives";
import { cn } from "@/components/ui/utils";
import type { ProSafetyRiskRow } from "@/app/(pro)/pro/queries";
import type { SafetyRiskSeverity } from "@/lib/data/types/safety-risk";

// Open Safety Risks — every safety risk on the book is "open" (the schema
// has no resolved flag), so this is a register of standing hazards ranked
// most-severe first by the query layer. The badge color tracks severity.

const SEVERITY_BADGE: Record<SafetyRiskSeverity, string> = {
  Critical:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  High: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  Medium:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  Low: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export function SafetyRisksCard({
  risks,
}: {
  risks: ProSafetyRiskRow[];
}) {
  return (
    <WidgetCard title="Open Safety Risks">
      {risks.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No open safety risks.
        </p>
      ) : (
        <ul className="flex flex-col">
          {risks.map((risk, index) => (
            <EnterLi
              key={risk.id}
              index={index}
              className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                  SEVERITY_BADGE[risk.severity],
                )}
              >
                {risk.severity}
              </span>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                  {risk.title}
                </span>
                <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                  {risk.propertyName} · {risk.clientName}
                </span>
              </div>
            </EnterLi>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
