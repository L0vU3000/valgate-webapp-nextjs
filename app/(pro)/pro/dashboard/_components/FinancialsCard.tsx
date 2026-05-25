"use client";

import { useState } from "react";
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
import { mockFinancials } from "../_data/mock";
import { cn } from "@/components/ui/utils";

// Financials widget — right column.
// Shows a collected-vs-expected progress bar, the outstanding amount,
// a small cashflow line chart, and a "View Full Financials" link.

const PERIODS = ["Month", "Quarter", "Year"] as const;
type Period = (typeof PERIODS)[number];

export function FinancialsCard() {
  const [period, setPeriod] = useState<Period>("Month");

  const { collected, expected, outstanding, cashflowSeries } = mockFinancials;
  const collectedPct = Math.round((collected / expected) * 100);

  return (
    <WidgetCard
      title="Financials"
      headerRight={
        <div className="inline-flex items-center p-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          {PERIODS.map((p) => {
            const isActive = p === period;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "h-6 px-2.5 rounded text-[11.5px] font-medium transition-colors",
                  isActive
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 text-[11px] font-semibold">
            {collectedPct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${collectedPct}%` }}
          />
        </div>
        <div className="text-[12.5px] text-amber-700 dark:text-amber-400 font-semibold">
          Outstanding{" "}
          <span className="tabular-nums">${outstanding.toLocaleString()}</span>
        </div>
      </div>

      <div className="h-32 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={cashflowSeries}
            margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
          >
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-400 dark:text-slate-500"
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={["dataMin - 1000", "dataMax + 1000"]} />
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
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Cashflow"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2.5, stroke: "#3b82f6", fill: "#0f172a", strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <a
        href="#"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        View Full Financials
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </WidgetCard>
  );
}
