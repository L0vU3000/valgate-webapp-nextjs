"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { FinancialsCard } from "@/app/(pro)/pro/dashboard/_components/FinancialsCard";
import { RentRollTable } from "./RentRollTable";
import { OverdueList } from "./OverdueList";
import { ExpiringLeasesCard } from "./ExpiringLeasesCard";
import { formatCurrencyFull } from "@/lib/format";
import type { RentPageData } from "@/app/(pro)/pro/queries";

// Composition for the Rent & Collections page:
//   header → KPI strip → [rent roll | overdue + trend + expirations]
// Every figure is a query-layer derivation over real records.

export function RentCollectionsPage({ data }: { data: RentPageData }) {
  // Optional client filter for the rent roll (client-side only).
  const [clientFilter, setClientFilter] = useState<string>("all");

  const filteredRoll =
    clientFilter === "all"
      ? data.rentRoll
      : data.rentRoll.filter((row) => row.clientId === clientFilter);

  const metrics = [
    {
      value: formatCurrencyFull(data.expected),
      label: `Expected — ${data.monthLabel}`,
      subLabel: `${data.rentRoll.length} active leases`,
    },
    {
      value: formatCurrencyFull(data.collected),
      label: "Collected",
      subLabel: `${data.collectionRate}% collection rate`,
    },
    {
      value: formatCurrencyFull(data.outstanding),
      label: "Outstanding",
      subLabel: `${data.overdue.length} overdue or unpaid`,
    },
    {
      value: `${data.occupancy.occupancyRate}%`,
      label: "Occupancy",
      subLabel: `${data.occupancy.rented} rented · ${data.occupancy.vacant} vacant`,
    },
    {
      value: String(data.expiring.length),
      label: "Leases expiring ≤90d",
      subLabel: "Renewal decisions due",
    },
  ];

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <header className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
            <span>Valgate Professional</span>
            <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Rent & Collections
            </span>
          </div>
          <h1 className="text-[28px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
            Rent & Collections
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            {data.monthLabel} rent roll across all clients
          </p>
        </header>

        <KpiMetricStrip
          metrics={metrics}
          ariaLabel="Rent and collections metrics"
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
          <div className="flex flex-col gap-6">
            <RentRollTable
              rows={filteredRoll}
              clients={data.clients}
              clientFilter={clientFilter}
              onClientFilterChange={setClientFilter}
            />
          </div>
          <div className="flex flex-col gap-6">
            <OverdueList rows={data.overdue} />
            <FinancialsCard
              financials={{
                expected: data.expected,
                collected: data.collected,
                outstanding: data.outstanding,
                series: data.series,
              }}
              monthLabel={data.monthLabel}
            />
            <ExpiringLeasesCard leases={data.expiring} />
          </div>
        </div>
      </div>
    </main>
  );
}
