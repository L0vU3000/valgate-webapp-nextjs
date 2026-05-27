"use client";

import { ArrowRight, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import type { ClientOverview } from "@/app/(pro)/pro/_data/mock";

type Props = {
  occupancy: ClientOverview["occupancy"];
};

export function ClientOccupancyCard({ occupancy }: Props) {
  const { occupiedUnits, vacantUnits, leasesExpiringSoon } = occupancy;
  const totalUnits = occupiedUnits + vacantUnits;
  const occupancyPct = Math.round((occupiedUnits / totalUnits) * 100);

  const chartData = [
    { name: "Occupied", value: occupiedUnits, color: "#10b981" },
    { name: "Vacant", value: vacantUnits, color: "#e2e8f0" },
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-semibold leading-none text-slate-900">
            {occupancyPct}%
          </span>
          <span className="mt-1 text-[11px] text-slate-500">Occupied</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Occupied {occupiedUnits} units
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />
          Vacant {vacantUnits} unit
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        {leasesExpiringSoon} lease expiring in next 90 days
      </div>

      <a
        href="#"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 hover:text-blue-700"
      >
        View Lease Details
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </WidgetCard>
  );
}
