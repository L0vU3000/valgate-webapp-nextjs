"use client";

import { ArrowRight, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { mockOccupancy } from "../_data/mock";

// Occupancy widget — right column.
// A donut chart with the occupancy percentage in the centre, a legend
// underneath, and a small "leases expiring soon" warning row.
//
// We compute the donut colours dynamically based on whether the page is in
// dark mode at render time. The .dark class is toggled on a parent element
// by ShellLayout, so we read it from the DOM. This is safe because the
// component is "use client" and only renders on the client.

import { useEffect, useState } from "react";

function useIsDark() {
  // Tracks whether an ancestor has the `.dark` class. Updates if the user
  // toggles light/dark from the sidebar.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () => {
      // The .dark class is set on the outer ShellLayout div, which is an
      // ancestor of <html>. We just look for it anywhere in the ancestor
      // chain by checking document for the class.
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

export function OccupancyCard() {
  const { occupiedUnits, vacantUnits, leasesExpiringSoon } = mockOccupancy;
  const totalUnits = occupiedUnits + vacantUnits;
  const occupancyPct = Math.round((occupiedUnits / totalUnits) * 100);
  const isDark = useIsDark();

  // Vacant slice colour switches between light grey (light mode) and a
  // muted dark grey (dark mode) so it reads against the card background.
  const vacantColor = isDark ? "#334155" : "#e2e8f0";

  const chartData = [
    { name: "Occupied", value: occupiedUnits, color: "#10b981" },
    { name: "Vacant", value: vacantUnits, color: vacantColor },
  ];

  return (
    <WidgetCard title="Occupancy">
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
            {occupancyPct}%
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Occupied
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Occupied {occupiedUnits} units
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          Vacant {vacantUnits} units
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 text-[12px] text-amber-700 dark:text-amber-400 font-medium">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        {leasesExpiringSoon} leases expiring in next 90 days
      </div>

      <a
        href="#"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        View Lease Details
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </WidgetCard>
  );
}
