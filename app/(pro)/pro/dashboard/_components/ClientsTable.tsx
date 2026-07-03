"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, Pencil, Plus, Users } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import {
  EnterTr,
  DrawInBar,
} from "@/app/(pro)/pro/_components/motion-primitives";
import { useWorkspaceTabs } from "@/app/(pro)/pro/_components/WorkspaceTabProvider";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { OWN_PORTFOLIO_ID } from "@/app/(pro)/pro/_components/pro-shell-types";
import { ManageMembersDrawer } from "@/app/(pro)/pro/clients/_components/ManageMembersDrawer";
import { formatRelativeTime } from "@/lib/format";
import { progressDotColor } from "@/lib/property-helpers";
import { cn } from "@/components/ui/utils";
import type { ClientRollup } from "../../queries";

// Clients table — left column widget, top half.
// One row per managed client; every cell comes from the client rollup.
// Clients with an orgId (manager-led onboarding) show a Status column and a
// "Manage members" action that opens ManageMembersDrawer inline.

// Maps the best handoff status across an org to a display label + colour.
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  accepted: {
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  pending: {
    label: "Invited",
    className:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  draft: {
    label: "Draft",
    className:
      "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
  },
  bounced: {
    label: "Bounced",
    className:
      "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  },
};

const COLUMNS = [
  { label: "Client", width: "w-[24%]" },
  { label: "Properties", width: "w-[9%]" },
  { label: "Occupancy", width: "w-[19%]" },
  { label: "Value", width: "w-[10%]" },
  { label: "Progress", width: "w-[10%]" },
  { label: "Status", width: "w-[13%]" },
  { label: "Activity", width: "w-[9%]" },
  { label: "", width: "w-[6%]" },
] as const;

// Optional onArchive prop — when provided, each row shows an Archive action.
// The dashboard widget omits this prop so archive is only reachable from the
// dedicated clients index page.
//
// Optional showAddClient prop — when set, the header carries the primary
// "Add Client" CTA (used on the dashboard, where this is the sole client
// surface). The /pro/clients index page omits it: that page already has an
// Add Client button in its own header, so doubling it up would be redundant.
export function ClientsTable({
  clients,
  onArchive,
  showAddClient = false,
}: {
  clients: ClientRollup[];
  onArchive?: (clientId: string) => Promise<void>;
  showAddClient?: boolean;
}) {
  const { openClientTab } = useWorkspaceTabs();
  const [managingOrgId, setManagingOrgId] = useState<string | null>(null);
  const [managingName, setManagingName] = useState<string>("");

  function openMembersDrawer(orgId: string, name: string) {
    setManagingOrgId(orgId);
    setManagingName(name);
  }

  function closeMembersDrawer() {
    setManagingOrgId(null);
    setManagingName("");
  }

  return (
    <>
      <WidgetCard
        title="Clients"
        headerRight={
          <div className="flex items-center gap-3">
            <Link
              href="/pro/clients"
              className="text-[12.5px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              View All
            </Link>
            {showAddClient && (
              <Link
                href="/pro/clients?add=1"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12.5px] font-medium text-white transition-[background-color,transform] hover:bg-blue-700 active:scale-[0.97]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Client
              </Link>
            )}
          </div>
        }
      >
        <div className="overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {COLUMNS.map((col) => (
                  <th
                    key={col.label || "actions"}
                    className={cn(
                      "py-2 pr-3 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400",
                      col.width,
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400"
                  >
                    No clients yet — onboard your first client.
                  </td>
                </tr>
              )}
              {clients.map((rollup, index) => {
                const statusCfg = rollup.confirmationStatus
                  ? STATUS_CONFIG[rollup.confirmationStatus]
                  : null;
                const hasOrg =
                  !!rollup.client.orgId && rollup.client.id !== OWN_PORTFOLIO_ID;

                return (
                  <EnterTr
                    key={rollup.client.id}
                    index={index}
                    onClick={() => openClientTab(rollup.client.id)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 active:bg-slate-100/70 dark:active:bg-slate-800/70 transition-colors cursor-pointer"
                  >
                    {/* Client avatar + name */}
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold",
                            rollup.client.avatarBg,
                          )}
                        >
                          {rollup.client.initials}
                        </span>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                            {rollup.client.name}
                          </span>
                          <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                            {rollup.client.id === OWN_PORTFOLIO_ID
                              ? "Properties you own directly"
                              : rollup.client.clientType}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Property count */}
                    <td className="py-3 pr-3 text-[13px] text-slate-700 dark:text-slate-300">
                      {rollup.propertyCount}
                    </td>

                    {/* Occupancy bar */}
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <DrawInBar
                          percent={rollup.occupancyRate}
                          delaySeconds={0.15 + index * 0.035}
                          trackClassName="flex-1"
                        />
                        <span className="text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {rollup.occupancyRate}%
                        </span>
                      </div>
                    </td>

                    {/* Portfolio value */}
                    <td className="py-3 pr-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                      {rollup.totalValueFormatted}
                    </td>

                    {/* Progress — data completeness score across this client's properties */}
                    <td className="py-3 pr-3">
                      <span
                        className="inline-flex items-center gap-1.5"
                        title="Progress score across properties"
                      >
                        <span
                          className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            progressDotColor(rollup.avgProgress),
                          )}
                        />
                        <span className="text-[12px] text-slate-600 dark:text-slate-300 tabular-nums">
                          {rollup.avgProgress}%
                        </span>
                      </span>
                    </td>

                    {/* Status — invitation/confirmation status for manager-led clients */}
                    <td className="py-3 pr-3">
                      {statusCfg ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            statusCfg.className,
                          )}
                        >
                          {statusCfg.label}
                          {/* Show member count for active orgs */}
                          {rollup.confirmationStatus === "accepted" &&
                            (rollup.memberCount ?? 0) > 0 && (
                              <span className="opacity-70">
                                ·{" "}
                                {rollup.memberCount}m
                              </span>
                            )}
                          {/* Show pending count for invited orgs with unresolved invitees */}
                          {rollup.confirmationStatus !== "accepted" &&
                            (rollup.pendingCount ?? 0) > 0 && (
                              <span className="opacity-70">
                                · {rollup.pendingCount}
                              </span>
                            )}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-slate-400 dark:text-slate-500">
                          —
                        </span>
                      )}
                    </td>

                    {/* Last activity */}
                    <td className="py-3 pr-3 text-[12px] text-slate-500 dark:text-slate-400">
                      {formatRelativeTime(rollup.lastActivityAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openClientTab(rollup.client.id)}
                          className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-800 text-[11.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          View
                        </button>

                        {/* Edit details — B → A: deep-link to the client detail
                            page with the drawer already open. Gated like archive
                            (index page only; never the synthetic own-portfolio row). */}
                        {onArchive && rollup.client.id !== OWN_PORTFOLIO_ID && (
                          <Link
                            href={`/pro/clients/${rollup.client.id}?edit=1`}
                            title="Edit details"
                            aria-label={`Edit ${rollup.client.name}`}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        )}

                        {/* Manage members — only for manager-led portfolio clients */}
                        {hasOrg && (
                          <button
                            type="button"
                            onClick={() =>
                              openMembersDrawer(
                                rollup.client.orgId!,
                                rollup.client.name,
                              )
                            }
                            title="Manage members"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Archive — only on the clients index page (onArchive provided) */}
                        {onArchive && rollup.client.id !== OWN_PORTFOLIO_ID && (
                          <ConfirmAction
                            tier="confirm"
                            title={`Archive ${rollup.client.name}?`}
                            description="This client will be removed from your active book. You can reactivate them at any time."
                            confirmLabel="Archive"
                            successMessage={`${rollup.client.name} archived`}
                            onConfirm={async () => {
                              await onArchive(rollup.client.id);
                            }}
                          >
                            <button
                              type="button"
                              aria-label={`Archive ${rollup.client.name}`}
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          </ConfirmAction>
                        )}
                      </div>
                    </td>
                  </EnterTr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WidgetCard>

      {/* ManageMembersDrawer — shared across all rows in the table */}
      {managingOrgId && (
        <ManageMembersDrawer
          open={managingOrgId !== null}
          onOpenChange={(open) => {
            if (!open) closeMembersDrawer();
          }}
          orgId={managingOrgId}
          portfolioName={managingName}
        />
      )}
    </>
  );
}
