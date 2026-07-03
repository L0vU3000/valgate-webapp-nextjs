"use client";

// The recharts donut inside OccupancyCard, split into its own module so recharts (~120 kB) lives
// in this one lazy chunk. OccupancyCard loads it via next/dynamic, keeping recharts out of the
// initial bundle of every page that shows the card (dashboard, client portfolio).
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// One slice per occupancy state (Rented / Vacant): label, count, and fill colour.
type OccupancySlice = { name: string; value: number; color: string };

export function OccupancyCardChart({ chartData }: { chartData: OccupancySlice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={48}
          outerRadius={66}
          startAngle={90}
          endAngle={-270}
          strokeWidth={0}
        >
          {chartData.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
