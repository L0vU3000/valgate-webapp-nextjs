"use client";

import { useRouter } from "next/navigation";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EnterLi } from "@/app/(pro)/pro/_components/motion-primitives";
import { resolveSafetyRisk } from "@/app/(pro)/pro/actions";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toActionResult } from "@/lib/client/action-result";
import { cn } from "@/components/ui/utils";
import type { ProSafetyRiskRow } from "@/app/(pro)/pro/queries";
import type { SafetyRiskSeverity } from "@/lib/data/types/safety-risk";

// Safety Risks register — standing hazards, ranked most-severe first by the
// query layer. Open risks resolve behind a Phase 4 "confirm" dialog (resolving
// is one-way); resolving drops the row from the open count and, unless the
// parent's "Show resolved" toggle is on, from this list too. Resolved rows are
// rendered READ-ONLY (no Resolve button) so they stay reviewable (task 7).

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
  title = "Open Safety Risks",
  emptyMessage = "No open safety risks.",
}: {
  // Risks to render. The parent decides whether this list is open-only or
  // includes resolved rows (driven by the "Show resolved" toggle).
  risks: ProSafetyRiskRow[];
  title?: string;
  emptyMessage?: string;
}) {
  const router = useRouter();

  return (
    <WidgetCard title={title}>
      {risks.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col">
          {risks.map((risk, index) => {
            const isResolved = risk.status === "Resolved";
            return (
              <EnterLi
                key={risk.id}
                index={index}
                className={cn(
                  "flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800",
                  // Dim resolved rows so the open ones stay the focus.
                  isResolved && "opacity-60",
                )}
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
                  <span
                    className={cn(
                      "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
                      isResolved && "line-through",
                    )}
                  >
                    {risk.title}
                  </span>
                  <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                    {risk.propertyName} · {risk.clientName}
                  </span>
                </div>
                {isResolved ? (
                  // Read-only: a resolved risk is reviewable, not re-actionable.
                  <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    Resolved
                  </span>
                ) : (
                  // Resolving is one-way → Phase 4 "confirm" tier. router.refresh()
                  // on success re-derives the list and the Open Risks KPI; the
                  // active client filter is preserved by the parent.
                  <ConfirmAction
                    tier="confirm"
                    title="Mark this risk resolved?"
                    description={`"${risk.title}" will be marked resolved and dropped from the open-risks count.`}
                    confirmLabel="Resolve"
                    successMessage="Safety risk resolved"
                    onConfirm={async () => {
                      const res = await resolveSafetyRisk({ riskId: risk.id });
                      if (res.ok) router.refresh();
                      return toActionResult(res);
                    }}
                  >
                    <button
                      type="button"
                      className="mt-0.5 h-7 shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      Resolve
                    </button>
                  </ConfirmAction>
                )}
              </EnterLi>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
