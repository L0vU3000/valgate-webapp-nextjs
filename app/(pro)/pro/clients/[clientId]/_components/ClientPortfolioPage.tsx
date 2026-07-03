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
import type { ChangeRequest } from "@/lib/services/change-requests";
import { ClipboardList } from "lucide-react";

// Composition for one client's portfolio page.
// Reuses the dashboard widgets (they are data-shape generic) with the
// client-scoped slices, plus the client-specific header, KPI banner,
// contact card and the monthly owner statement.

// ─── Change requests status card ─────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  denied: { label: "Declined", className: "bg-red-100 text-red-700" },
};

function ChangeRequestsCard({ requests }: { requests: ChangeRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-slate-400" />
          <h3 className="text-[14px] font-semibold text-slate-800">My change proposals</h3>
        </div>
        <p className="text-[13px] text-slate-400">
          No change proposals submitted yet. Use{" "}
          <span className="font-medium text-slate-500">View as client → Propose changes</span>{" "}
          to suggest a property update.
        </p>
      </div>
    );
  }

  // Show the 5 most recent requests, newest first.
  const sorted = [...requests].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const visible = sorted.slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-400" />
          <h3 className="text-[14px] font-semibold text-slate-800">My change proposals</h3>
        </div>
        <span className="text-[12px] text-slate-400">{requests.length} total</span>
      </div>

      <div className="space-y-2">
        {visible.map((cr) => {
          const style = STATUS_STYLES[cr.status] ?? STATUS_STYLES.pending;
          // Show operation alongside entity type so managers can see what they proposed at a glance.
          const opLabel = cr.operation === "create" ? "Add" : cr.operation === "delete" ? "Remove" : "Edit";
          const entityLabel = cr.entityType.charAt(0).toUpperCase() + cr.entityType.slice(1);
          // For update operations show field names; for create/delete show the entity id or "new".
          const patchKeys = Object.keys(cr.proposedPatch);
          const detailSummary =
            cr.operation === "delete"
              ? `Remove ${entityLabel}${cr.entityId ? ` ${cr.entityId}` : ""}`
              : cr.operation === "create"
              ? `New ${entityLabel}`
              : patchKeys.slice(0, 3).join(", ") + (patchKeys.length > 3 ? "…" : "");
          return (
            <div
              key={cr.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-slate-700 truncate">
                  {opLabel} {entityLabel}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {detailSummary || "—"}
                  <span className="text-slate-300 mx-1">·</span>
                  {cr.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${style.className}`}
              >
                {style.label}
              </span>
            </div>
          );
        })}
      </div>

      {requests.length > 5 && (
        <p className="mt-2 text-[11px] text-slate-400 text-right">
          +{requests.length - 5} older proposals
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClientPortfolioPage({
  data,
  changeRequests,
}: {
  data: ClientPortfolioData;
  changeRequests: ChangeRequest[];
}) {
  const { rollup } = data;

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <ClientPageHeader rollup={rollup} viewAsClerkOrgId={data.viewAsClerkOrgId} />
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
            {/* Manager's submitted change proposals for this client */}
            <ChangeRequestsCard requests={changeRequests} />
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
