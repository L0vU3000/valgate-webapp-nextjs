"use client";

import { ClientPageHeader } from "./ClientPageHeader";
import { ClientKpiBanner } from "./ClientKpiBanner";
import { ClientContactCard } from "./ClientContactCard";
import { OwnerStatementCard } from "./OwnerStatementCard";
import { AlertsStrip } from "@/app/(pro)/pro/dashboard/_components/AlertsStrip";
import { AssetsTable } from "@/app/(pro)/pro/dashboard/_components/AssetsTable";
import { MaintenanceQueueCard } from "@/app/(pro)/pro/dashboard/_components/MaintenanceQueueCard";
import { FinancialsCard } from "@/app/(pro)/pro/dashboard/_components/FinancialsCard";
import { OccupancyCard } from "@/app/(pro)/pro/dashboard/_components/OccupancyCard";
import { ComplianceTable } from "@/app/(pro)/pro/dashboard/_components/ComplianceTable";
import { ActivityFeed } from "@/app/(pro)/pro/dashboard/_components/ActivityFeed";
import type { ClientPortfolioData } from "@/app/(pro)/pro/queries";

// Composition for one client's portfolio page.
// Reuses the dashboard widgets (they are data-shape generic) with the
// client-scoped slices, plus the client-specific header, KPI banner,
// contact card and the monthly owner statement.

export function ClientPortfolioPage({ data }: { data: ClientPortfolioData }) {
  const { rollup } = data;

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <ClientPageHeader rollup={rollup} />
        <ClientKpiBanner rollup={rollup} />
        <AlertsStrip alerts={rollup.alerts} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
          <div className="flex flex-col gap-6">
            <AssetsTable properties={data.properties} />
            <OwnerStatementCard
              statement={data.ownerStatement}
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
            <OccupancyCard
              occupancy={{
                rented: rollup.rentedCount,
                vacant: rollup.vacantCount,
                occupancyRate: rollup.occupancyRate,
                leasesExpiring90d: data.leasesExpiring90d,
              }}
            />
            <MaintenanceQueueCard
              queue={data.workOrders.filter((w) => w.status !== "Resolved")}
            />
            <ComplianceTable compliance={data.compliance} />
            <ClientContactCard client={rollup.client} />
          </div>
        </div>

        <ActivityFeed activity={data.activity} />
      </div>
    </main>
  );
}
