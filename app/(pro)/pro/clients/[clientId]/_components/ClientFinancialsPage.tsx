"use client";

import { useState } from "react";
import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import {
  RentRollTable,
  type RentStatusFilter,
} from "@/app/(pro)/pro/rent/_components/RentRollTable";
import { OverdueList } from "@/app/(pro)/pro/rent/_components/OverdueList";
import { ExpiringLeasesCard } from "@/app/(pro)/pro/rent/_components/ExpiringLeasesCard";
import { FinancialsCard } from "@/app/(pro)/pro/dashboard/_components/FinancialsCard";
import { OwnerStatementCard } from "./OwnerStatementCard";
import { formatCurrencyFull } from "@/lib/format";
import type { ClientPortfolioData } from "@/app/(pro)/pro/queries";

// The client Financials tab — a rent-and-collections + owner-statement
// workspace scoped to one client. Composes the same widgets the global
// /pro/rent page and the Overview tab use, over this client's slice
// (see deriveRentSurfaces in queries.ts). No new derivation lives here.

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function ClientFinancialsPage({
  data,
}: {
  data: ClientPortfolioData;
}) {
  const { rollup, ownerStatement } = data;

  // Status tabs filter the rent roll client-side. "Overdue" folds in Unpaid
  // rows (leases with no payment record yet this month).
  const [statusFilter, setStatusFilter] = useState<RentStatusFilter>("All");
  const filteredRoll =
    statusFilter === "All"
      ? data.rentRoll
      : statusFilter === "Overdue"
        ? data.rentRoll.filter(
            (row) => row.rentStatus === "Overdue" || row.rentStatus === "Unpaid",
          )
        : data.rentRoll.filter((row) => row.rentStatus === statusFilter);

  // Five metrics — matches KpiMetricStrip's 5-wide grid so they sit on one
  // row at desktop width. Portfolio value lives on the Overview banner and
  // client header; here the money-flow figures lead.
  const metrics = [
    {
      value: formatCurrencyFull(rollup.monthlyExpected),
      label: "Expected — this month",
      subLabel: `${data.rentRoll.length} active ${plural(data.rentRoll.length, "lease", "leases")}`,
    },
    {
      value: formatCurrencyFull(rollup.monthlyCollected),
      label: "Collected",
      subLabel: `${data.collectionRate}% collection rate`,
    },
    {
      value: formatCurrencyFull(rollup.outstanding),
      label: "Outstanding",
      subLabel: `${data.overdue.length} overdue or unpaid`,
    },
    {
      value: `${rollup.occupancyRate}%`,
      label: "Occupancy",
      subLabel: `${rollup.rentedCount} rented · ${rollup.vacantCount} vacant`,
    },
    {
      value: formatCurrencyFull(rollup.noiMonthly),
      label: "Net operating income",
      subLabel: "after fees & maintenance",
    },
  ];

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <KpiMetricStrip
          metrics={metrics}
          ariaLabel={`Financials for ${rollup.client.name}`}
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
          <div className="flex flex-col gap-6">
            <RentRollTable
              rows={filteredRoll}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              hideClient
            />
            <OwnerStatementCard
              statement={ownerStatement}
              clientName={rollup.client.name}
            />
          </div>
          <div className="flex flex-col gap-6">
            <FinancialsCard
              financials={{
                expected: rollup.monthlyExpected,
                collected: rollup.monthlyCollected,
                outstanding: rollup.outstanding,
                series: data.financialSeries,
              }}
              monthLabel="This month"
            />
            <OverdueList rows={data.overdue} />
            <ExpiringLeasesCard leases={data.expiring} />
          </div>
        </div>
      </div>
    </main>
  );
}
