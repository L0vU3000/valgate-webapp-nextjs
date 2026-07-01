"use client";

// The 12-month valuation trend area chart, shared by the property Financials and Valuation
// pages (both rendered an identical chart). It owns the recharts imports so recharts (~120 kB)
// lives in this one chunk. Callers load it via next/dynamic, so recharts is only downloaded
// when a page that actually shows the chart renders — not on every property route.
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// One point per month: the month label (x-axis) and the property's value that month (y-axis).
type ValueHistoryPoint = { month: string; price: number };

export function ValueHistoryChart({
  valueHistory,
  chartDomain,
}: {
  valueHistory: ValueHistoryPoint[];
  // Fixed [min, max] y-axis bounds computed by the page so the trend line isn't clipped.
  chartDomain: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={valueHistory} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="valGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.10} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `$${(v / 1_000_000).toFixed(1)}M`
              : `$${Math.round(v / 1000)}k`
          }
          axisLine={false}
          tickLine={false}
          domain={chartDomain}
        />
        <Tooltip
          formatter={(v: number) => [`$${v.toLocaleString()}`, "Value"]}
          contentStyle={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#valGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#2563EB", strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
