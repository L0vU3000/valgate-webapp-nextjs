"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
          >
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-400 dark:text-slate-500"
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, "dataMax + 1000"]} />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
              wrapperClassName="!outline-none"
              contentStyle={{
                fontSize: 11,
                padding: "4px 8px",
                background: "rgb(15 23 42)",
                border: "1px solid rgb(51 65 85)",
                borderRadius: 6,
                color: "rgb(241 245 249)",
              }}
              labelStyle={{ color: "rgb(148 163 184)" }}
              itemStyle={{ color: "rgb(241 245 249)" }}
              formatter={(value: number) => [
                `$${value.toLocaleString()}`,
                "Collected",
              ]}
            />
            <Line
              type="monotone"
              dataKey="collected"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2.5, stroke: "#3b82f6", fill: "#0f172a", strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
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
