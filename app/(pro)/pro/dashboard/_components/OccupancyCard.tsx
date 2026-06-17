"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import type { ProDashboardData } from "../../queries";

// Occupancy widget — right column.
// Donut of rented vs vacant active properties (real Property statuses)
// with the count of signed leases expiring inside 90 days.

function useIsDark() {
  // Tracks whether an ancestor has the `.dark` class so the vacant
  // donut slice stays readable in both themes.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () => {
      const hasDark = document.querySelector(".dark") !== null;
      setIsDark(hasDark);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function OccupancyCard({
  occupancy,
}: {
  occupancy: ProDashboardData["occupancy"];
}) {
  const { rented, vacant, occupancyRate, leasesExpiring90d } = occupancy;
  const isDark = useIsDark();

  const vacantColor = isDark ? "#334155" : "#e2e8f0";

  const chartData = [
    { name: "Rented", value: rented, color: "#10b981" },
    { name: "Vacant", value: vacant, color: vacantColor },
  ];

  const hasData = rented + vacant > 0;

  return (
    <WidgetCard title="Occupancy">
      {hasData ? (
        <div className="relative h-36">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[24px] font-semibold text-slate-900 dark:text-slate-100 leading-none">
              {occupancyRate}%
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Occupied
            </span>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No rentable properties yet.
        </div>
      )}

      <div className="flex items-center justify-center gap-5 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Rented {rented}
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          Vacant {vacant}
        </span>
      </div>

      {leasesExpiring90d > 0 && (
        <div className="inline-flex items-center gap-1.5 text-[12px] text-amber-700 dark:text-amber-400 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          {leasesExpiring90d}{" "}
          {leasesExpiring90d === 1 ? "lease expiring" : "leases expiring"} in
          next 90 days
        </div>
      )}

      <Link
        href="/pro/rent"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        View Lease Details
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </WidgetCard>
  );
}
