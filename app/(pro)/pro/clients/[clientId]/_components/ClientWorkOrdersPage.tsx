"use client";

import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { WorkOrdersTable } from "@/app/(pro)/pro/work-orders/_components/WorkOrdersTable";
import { VendorsCard } from "@/app/(pro)/pro/work-orders/_components/VendorsCard";
import { formatCurrencyFull } from "@/lib/format";
import type { ClientPortfolioData } from "@/app/(pro)/pro/queries";

// The client Work Orders tab — a maintenance workspace scoped to one client.
// Composes the same widgets the global /pro/work-orders page uses (status
// tiles, the full orders table with inline status + assign-vendor actions, the
// vendor directory), over this client's slice (see deriveWorkOrderSurfaces in
// queries.ts). No new derivation lives here.

export function ClientWorkOrdersPage({
  data,
}: {
  data: ClientPortfolioData;
}) {
  const { workOrderCounts, rollup } = data;

  // Five metrics — matches KpiMetricStrip's 5-wide grid so they sit on one row
  // at desktop width. Same figures the global Work Orders KPI strip shows,
  // scoped to this client. No invented deltas; sub-labels only.
  const metrics = [
    {
      value: String(workOrderCounts.open),
      label: "Open",
      subLabel: "Awaiting action",
    },
    {
      value: String(workOrderCounts.inProgress),
      label: "In Progress",
      subLabel: "Being worked",
    },
    {
      value: String(workOrderCounts.urgentOpen),
      label: "Urgent / Emergency",
      subLabel: "Highest priority queue",
    },
    {
      value: String(workOrderCounts.resolved),
      label: "Resolved",
      subLabel: "Completed work orders",
    },
    {
      value: formatCurrencyFull(data.totalOpenWorkOrderCost),
      label: "Open est. cost",
      subLabel: "Sum of unresolved estimates",
    },
  ];

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <KpiMetricStrip
          metrics={metrics}
          ariaLabel={`Work orders for ${rollup.client.name}`}
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
          <WorkOrdersTable
            rows={data.workOrders}
            vendors={data.workOrderVendors}
            hideClient
          />
          <VendorsCard vendors={data.workOrderVendors} />
        </div>
      </div>
    </main>
  );
}
