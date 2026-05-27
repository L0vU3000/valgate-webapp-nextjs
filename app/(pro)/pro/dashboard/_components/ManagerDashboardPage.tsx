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

// Top-level composition for the Asset Manager Dashboard POC.
//
// Layout:
//   <AppHeader />                                              ← existing top bar
//   <main> (vertical scroll container)
//     <div max-w-1440 mx-auto>                                 ← fixed 1440px canvas
//       <PageHeader />                                         ← title + tabs
//       <KpiBanner />                                          ← 5 stat cards
//       <AlertsStrip />                                        ← alert chips
//       <div grid 65/35>                                       ← main content split
//         <div col-left>                                       ← Clients + Assets
//         <div col-right>                                      ← 4 stacked widgets
//       </div>
//       <div grid 50/50>                                       ← bottom row
//         <ComplianceTable />
//         <ActivityFeed />
//       </div>
//     </div>
//   </main>

export function ManagerDashboardPage() {
  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          <PageHeader />
          <KpiBanner />
          <AlertsStrip />

          {/* 65 / 35 main content split */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
            <div className="flex flex-col gap-6">
              <ClientsTable />
              <AssetsTable />
            </div>
            <div className="flex flex-col gap-6">
              <WorkOrderStatusCard />
              <FinancialsCard />
              <OccupancyCard />
              <MaintenanceQueueCard />
            </div>
          </div>

          {/* 50 / 50 bottom row */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <ComplianceTable />
            <ActivityFeed />
          </div>
        </div>
    </main>
  );
}
