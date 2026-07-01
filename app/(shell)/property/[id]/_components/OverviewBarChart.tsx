"use client";

// The small 6-month income-vs-expense bar chart from the property Overview page, split into its own
// module so recharts (~120 kB) lives in this one lazy chunk. PropertyOverviewPage loads it via
// next/dynamic, so recharts is no longer in the overview route's initial bundle.
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatCurrencyFull } from "@/lib/format";

// One bar group per month: the label plus income and expense totals.
type OverviewChartPoint = { label: string; income: number; expense: number };

export function OverviewBarChart({ chartData }: { chartData: OverviewChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={72}>
      <BarChart data={chartData} barSize={7} barGap={1} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{
            fontSize: 11,
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
          }}
          formatter={(value: number, name: string) => [
            formatCurrencyFull(value),
            name === "income" ? "Income" : "Expenses",
          ]}
        />
        <Bar dataKey="income"  fill="var(--val-primary-dark)" radius={[2, 2, 0, 0]} opacity={0.85} />
        <Bar dataKey="expense" fill="#fda4af"                 radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
