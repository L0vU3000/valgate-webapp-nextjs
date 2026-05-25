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
import type { ClientOverview } from "@/app/(pro)/pro/_data/mock";
import { cn } from "@/components/ui/utils";

const PERIODS = ["Month", "Quarter", "Year"] as const;
type Period = (typeof PERIODS)[number];

type Props = {
  financials: ClientOverview["financials"];
};

export function ClientFinancialsCard({ financials }: Props) {
  const [period, setPeriod] = useState<Period>("Month");
  const { collected, expected, outstanding, cashflowSeries } = financials;
  const collectedPct = Math.round((collected / expected) * 100);

  return (
    <WidgetCard
      title="Financials"
      headerRight={
        <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5">
          {PERIODS.map((option) => {
            const isActive = option === period;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={cn(
                  "h-6 rounded px-2.5 text-[11.5px] font-medium transition-colors",
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-slate-600">
            Collected{" "}
            <span className="font-semibold tabular-nums text-slate-900">
              ${collected.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="tabular-nums text-slate-700">
              ${expected.toLocaleString()}
            </span>{" "}
            expected
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {collectedPct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${collectedPct}%` }}
          />
        </div>
        <div className="text-[12.5px] font-semibold text-amber-700">
          Outstanding{" "}
          <span className="tabular-nums">${outstanding.toLocaleString()}</span>
        </div>
      </div>

      <div className="-mx-1 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={cashflowSeries}
            margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
          >
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={["dataMin - 1000", "dataMax + 1000"]} />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
              contentStyle={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 6,
              }}
              formatter={(value: number) => [
                `$${value.toLocaleString()}`,
                "Cashflow",
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 2.5, stroke: "#2563eb", fill: "#fff", strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <a
        href="#"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 hover:text-blue-700"
      >
        View Full Financials
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </WidgetCard>
  );
}
