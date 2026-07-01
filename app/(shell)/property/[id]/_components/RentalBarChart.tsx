"use client";

// The recharts rent-vs-expenses bar chart from the property Rental page, split into its own module
// so recharts (~120 kB) lives in this one lazy chunk. PropertyRentalPage loads it via next/dynamic,
// so recharts is no longer in the rental route's initial bundle. The custom tooltip + axis formatter
// live here too since they're only used by this chart.
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrencyFull } from "@/lib/format";

// One bar group per month: rent collected vs expenses.
type ChartMonth = { month: string; rent: number; expenses: number };

function formatChartAxis(value: number): string {
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

function FinancialChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-[0_4px_12px_rgba(18,28,40,0.08)]">
      <p className="text-[11px] font-semibold text-slate-500 mb-2">{label}</p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry) => {
          const isRent = entry.name === "rent";
          const amount = typeof entry.value === "number" ? entry.value : 0;
          return (
            <div key={String(entry.name)} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-[12px] text-slate-600">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isRent ? "var(--val-primary-dark)" : "#fda4af" }}
                />
                {isRent ? "Rent" : "Expenses"}
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-val-heading">
                {formatCurrencyFull(amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RentalBarChart({ chartData }: { chartData: ChartMonth[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        barCategoryGap="28%"
        barGap={4}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="#eef1f5"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={formatChartAxis}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,74,198,0.04)" }}
          content={<FinancialChartTooltip />}
        />
        <Bar
          dataKey="rent"
          fill="var(--val-primary-dark)"
          radius={[4, 4, 0, 0]}
          name="rent"
          opacity={0.92}
          maxBarSize={28}
        />
        <Bar
          dataKey="expenses"
          fill="#fda4af"
          radius={[4, 4, 0, 0]}
          name="expenses"
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
