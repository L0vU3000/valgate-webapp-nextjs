"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Plus, DollarSign } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
// The recharts chart loads lazily, client-only, so recharts is no longer in this card's — and
// therefore the dashboard/rent/client-portfolio pages' — initial bundle. The card frame renders
// instantly; only the chart area waits on the chunk (the skeleton fills the same h-32 box).
const FinancialsCardChart = dynamic(
  () => import("./FinancialsCardChart").then((m) => m.FinancialsCardChart),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" /> },
);
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { DrawInBar } from "@/app/(pro)/pro/_components/motion-primitives";
import { cn } from "@/components/ui/utils";
import type { ProDashboardData } from "../../queries";

// Financials widget — right column.
// Collected-vs-expected for the current month (real Payment and Lease
// records) plus a 6-month collected-rent trend derived from payments.

export function FinancialsCard({
  financials,
  monthLabel,
}: {
  financials: ProDashboardData["financials"];
  monthLabel: string;
}) {
  const { collected, expected, outstanding, series } = financials;

  // Nothing to chart yet — no leases and no payments on this portfolio.
  const hasFinancials =
    expected > 0 || collected > 0 || series.some((point) => point.collected > 0);

  if (!hasFinancials) {
    return (
      <WidgetCard
        title="Financials"
        headerRight={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11.5px] font-medium">
            {monthLabel}
          </span>
        }
      >
        <EmptyState
          icon={<DollarSign className="h-6 w-6" />}
          title="No rent tracked yet"
          description="Add a lease and record the first payment to start seeing collections and a monthly cash-flow trend."
          action={
            <Link
              href="/pro/rent"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Payment
            </Link>
          }
        />
      </WidgetCard>
    );
  }

  // Guard the zero-expected case and clamp at 100% so a strong month
  // never overflows the bar.
  const collectedPct =
    expected === 0 ? 0 : Math.min(100, Math.round((collected / expected) * 100));

  return (
    <WidgetCard
      title="Financials"
      headerRight={
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11.5px] font-medium">
          {monthLabel}
        </span>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-slate-600 dark:text-slate-300">
            Collected{" "}
            <span className="text-slate-900 dark:text-slate-100 font-semibold tabular-nums">
              ${collected.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="text-slate-700 dark:text-slate-200 tabular-nums">
              ${expected.toLocaleString()}
            </span>{" "}
            expected
          </span>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
              collectedPct >= 90
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
            )}
          >
            {collectedPct}%
          </span>
        </div>
        <DrawInBar
          percent={collectedPct}
          trackClassName="h-2"
          fillClassName="bg-emerald-500"
        />
        {outstanding > 0 && (
          <div className="text-[12.5px] text-amber-700 dark:text-amber-400 font-semibold">
            Outstanding{" "}
            <span className="tabular-nums">
              ${outstanding.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="h-32 -mx-1">
        <FinancialsCardChart series={series} />
      </div>

      <Link
        href="/pro/rent"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        View Rent & Collections
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </WidgetCard>
  );
}
