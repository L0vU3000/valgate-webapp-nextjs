"use client";

import { PageHeader } from "./PageHeader";
import { KpiBanner } from "./KpiBanner";
import { AlertsStrip } from "./AlertsStrip";
import { ClientsTable } from "./ClientsTable";
import { AssetsTable } from "./AssetsTable";
import { WorkOrderStatusCard } from "./WorkOrderStatusCard";
import { FinancialsCard } from "./FinancialsCard";
import { OccupancyCard } from "./OccupancyCard";
import { MaintenanceQueueCard } from "./MaintenanceQueueCard";
import { ComplianceTable } from "./ComplianceTable";
import { ActivityFeed } from "./ActivityFeed";
import { SectionEnter } from "@/app/(pro)/pro/_components/motion-primitives";
import type { ProDashboardData } from "../../queries";

// Top-level composition for the manager dashboard.
// Receives the full server-derived payload and distributes the slices
// to each widget — no widget invents its own data.
//
// Layout (managers):
//   <PageHeader />             ← title + breadcrumb + real book summary
//   <KpiBanner />              ← 5 stat cards (book-level rollups)
//   <AlertsStrip />            ← derived alert chips
//   <div grid 65/35>           ← Clients + Assets | 4 stacked widgets
//   <div grid 50/50>           ← Compliance | Activity
//
// The managed clients live in the ClientsTable widget below — the dedicated
// "Managed accounts" rollup that used to sit above the header was redundant
// with it and has been removed. Connected (invite-code) accounts have no
// dedicated switch-into-account surface right now (AccountSwitcher was
// removed); pending requests surface via the Add Client modal on /pro/clients.

export function ManagerDashboardPage({
  data,
}: {
  data: ProDashboardData;
}) {
  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <SectionEnter index={0}>
          <PageHeader
            clientCount={data.kpis.clientCount}
            propertyCount={data.kpis.propertyCount}
          />
        </SectionEnter>
        <SectionEnter index={1}>
          <KpiBanner kpis={data.kpis} />
        </SectionEnter>
        {/* AlertsStrip staggers its own chips, so it gets no extra wrapper. */}
        <AlertsStrip alerts={data.alerts} />

        {/* 65 / 35 main content split */}
        <SectionEnter
          index={2}
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]"
        >
          <div className="flex flex-col gap-6">
            <ClientsTable clients={data.clients} showAddClient />
            <AssetsTable properties={data.properties} />
          </div>
          <div className="flex flex-col gap-6">
            <WorkOrderStatusCard counts={data.workOrders.counts} />
            <FinancialsCard
              financials={data.financials}
              monthLabel={data.kpis.monthLabel}
            />
            <OccupancyCard occupancy={data.occupancy} />
            <MaintenanceQueueCard queue={data.workOrders.queue} />
          </div>
        </SectionEnter>

        {/* 50 / 50 bottom row */}
        <SectionEnter
          index={3}
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
        >
          <ComplianceTable compliance={data.compliance} />
          <ActivityFeed activity={data.activity} />
        </SectionEnter>
      </div>
    </main>
  );
}
