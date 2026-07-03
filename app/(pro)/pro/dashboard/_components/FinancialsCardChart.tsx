"use client";

// The recharts line chart inside FinancialsCard, split into its own module so recharts (~120 kB)
// lives in this one lazy chunk. FinancialsCard loads it via next/dynamic, so every page that shows
// the card (dashboard, rent, client portfolio) stops shipping recharts in its initial bundle.
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProDashboardData } from "../../queries";

export function FinancialsCardChart({
  series,
}: {
  // The 6-month collected-rent trend: one point per month.
  series: ProDashboardData["financials"]["series"];
}) {
  return (
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
  );
}
