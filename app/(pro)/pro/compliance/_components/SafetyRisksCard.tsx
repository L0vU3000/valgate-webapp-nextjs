"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EnterLi } from "@/app/(pro)/pro/_components/motion-primitives";
import { resolveSafetyRisk } from "@/app/(pro)/pro/actions";
import { cn } from "@/components/ui/utils";
import type { ProSafetyRiskRow } from "@/app/(pro)/pro/queries";
import type { SafetyRiskSeverity } from "@/lib/data/types/safety-risk";

// Open Safety Risks — the register of standing hazards, ranked most-severe
// first by the query layer. Each row resolves in one click (no modal, the
// same affordance as the work-order status flips): resolving it removes the
// row from this list and decrements the Open Risks KPI on the next refresh.

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Which row is mid-resolve, so only its button shows the pending label.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleResolve(riskId: string) {
    setError(null);
    setBusyId(riskId);
    startTransition(async () => {
      const result = await resolveSafetyRisk({ riskId });
      if (result.ok) {
        // Re-fetch the server component: the resolved risk drops off this list
        // and the Open Risks KPI falls. The active client filter is preserved.
        router.refresh();
      } else {
        setError(result.error);
      }
      setBusyId(null);
    });
  }

  return (
    <WidgetCard title="Open Safety Risks">
      {error && (
        <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
      )}
      {risks.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No open safety risks.
        </p>
      ) : (
        <ul className="flex flex-col">
          {risks.map((risk, index) => {
            const busy = isPending && busyId === risk.id;
            return (
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
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleResolve(risk.id)}
                  className="mt-0.5 h-7 shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                >
                  {busy ? "Saving…" : "Resolve"}
                </button>
              </EnterLi>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
