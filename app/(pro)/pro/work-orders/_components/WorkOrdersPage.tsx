"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { WorkOrdersTable } from "./WorkOrdersTable";
import { NewWorkOrderModal } from "./NewWorkOrderModal";
import { VendorsCard } from "./VendorsCard";
import { formatCurrencyFull } from "@/lib/format";
import type { WorkOrdersPageData } from "@/app/(pro)/pro/queries";

// Composition for the Work Orders page:
//   header (+ create form) → KPI strip → [orders table | vendors card]

export function WorkOrdersPage({ data }: { data: WorkOrdersPageData }) {
  const [createOpen, setCreateOpen] = useState(false);

  const metrics = [
    {
      value: String(data.counts.open),
      label: "Open",
      subLabel: "Awaiting action",
    },
    {
      value: String(data.counts.inProgress),
      label: "In Progress",
      subLabel: "Being worked",
    },
    {
      value: String(data.counts.resolved),
      label: "Resolved",
      subLabel: "Completed work orders",
    },
    {
      value: String(data.counts.urgentOpen),
      label: "Urgent / Emergency open",
      subLabel: "Highest priority queue",
    },
    {
      value: formatCurrencyFull(data.totalOpenCost),
      label: "Open est. cost",
      subLabel: "Sum of unresolved estimates",
    },
  ];

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
              <span>Valgate Professional</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Work Orders
              </span>
            </div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Work Orders
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              Maintenance coordination across all clients and properties
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Work Order
          </button>
        </header>

        <NewWorkOrderModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          properties={data.properties}
          vendors={data.vendors}
        />

        <KpiMetricStrip metrics={metrics} ariaLabel="Work order metrics" />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
          <WorkOrdersTable rows={data.rows} vendors={data.vendors} />
          <VendorsCard vendors={data.vendors} />
        </div>
      </div>
    </main>
  );
}
