"use client";

// The three recharts visualizations on the Analytics page (revenue area, expense donut, maintenance
// bars), split into one module so recharts (~120 kB) lives in a single lazy chunk. AnalyticsPage
// loads each via next/dynamic; because they all resolve to THIS module, recharts is fetched once
// when the first chart mounts, and kept out of the page's initial bundle entirely.
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// Data shapes match what AnalyticsPage passes; `animate` gates recharts' entrance animation so it
// only plays once the section has scrolled into view (the page owns that visibility state).
type RevenuePoint = { month: string; revenue: number; expenses: number };
type ExpenseSlice = { name: string; pct: number; color: string };
type MaintenancePoint = { month: string; value: number };

export function RevenueAreaChart({
  revenueData,
  animate,
}: {
  revenueData: RevenuePoint[];
  animate: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={revenueData}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v / 1000}k`} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: 4, color: "white", fontSize: 10 }}
          formatter={(value: number, name: string) => [`$${(value / 1000).toFixed(0)}k`, name === "revenue" ? "Revenue" : "Expenses"]}
          labelStyle={{ color: "white", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}
          animationDuration={200}
          animationEasing="ease-out"
        />
        <Area
          type="monotone" dataKey="revenue" stroke="#fbbf24" strokeWidth={2.5} fill="url(#revenueGrad)"
          isAnimationActive={animate} animationDuration={1200} animationEasing="ease-out"
        />
        <Area
          type="monotone" dataKey="expenses" stroke="#60a5fa" strokeWidth={2.5} fill="url(#expenseGrad)"
          isAnimationActive={animate} animationDuration={1200} animationEasing="ease-out" animationBegin={200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ExpensePieChart({
  expenseBreakdown,
  animate,
}: {
  expenseBreakdown: ExpenseSlice[];
  animate: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={expenseBreakdown}
          dataKey="pct"
          cx="50%" cy="50%"
          innerRadius={34} outerRadius={50}
          startAngle={90} endAngle={-270}
          strokeWidth={0}
          isAnimationActive={animate}
          animationDuration={900}
          animationEasing="ease-out"
        >
          {expenseBreakdown.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MaintenanceBarChart({
  maintenanceSpend,
  animate,
}: {
  maintenanceSpend: MaintenancePoint[];
  animate: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={128}>
      <BarChart data={maintenanceSpend}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
          contentStyle={{ fontSize: 10, borderRadius: 4 }}
        />
        <Bar
          dataKey="value" radius={[4, 4, 0, 0]}
          isAnimationActive={animate}
          animationDuration={800}
          animationEasing="ease-out"
        >
          {maintenanceSpend.map((entry, i) => (
            <Cell key={entry.month} fill={i === maintenanceSpend.length - 1 ? "var(--val-primary-dark)" : "#e2e8f0"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
