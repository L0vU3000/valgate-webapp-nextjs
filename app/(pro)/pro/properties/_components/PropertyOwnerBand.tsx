"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, Bell, ArrowRight } from "lucide-react";
import { EnterTr, DrawInBar } from "@/app/(pro)/pro/_components/motion-primitives";
import {
  TYPE_PILL,
  STATUS_PILL,
} from "@/app/(pro)/pro/dashboard/_components/AssetsTable";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProOwnerGroup, ProPropertyRow } from "@/app/(pro)/pro/queries";

// One owner band in the grouped Properties register: a collapsible header
// carrying that owner's roll-up stats, wrapping their property rows.
//
// "My Portfolio" (the manager's own book) is styled distinctly — an accent
// left edge, a tinted header, and a rounded SQUARE avatar — and always pins
// first; every other band is one managed client with a round initials avatar.
//
// `rows` is the already-filtered row set (search / type / status are applied
// by the parent), so the count pill and the visible list always agree.
export function PropertyOwnerBand({
  group,
  rows,
  expanded,
  onToggle,
}: {
  group: ProOwnerGroup;
  rows: ProPropertyRow[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const isOwn = group.isOwnPortfolio;

  return (
    <div className="border-b border-slate-200 last:border-0 dark:border-slate-800">
      {/* ─── Owner header band ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-3 border-l-[3px] px-4 py-3 transition-colors",
          isOwn
            ? "border-l-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
            : "border-l-transparent hover:bg-slate-50/70 dark:hover:bg-slate-800/40",
        )}
      >
        {/* The whole left cluster is the collapse toggle. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${group.ownerName}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {/* Own book = rounded accent square; clients = round initials avatar. */}
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center text-[11px] font-semibold text-white",
              group.avatarBg,
              isOwn ? "rounded-lg" : "rounded-full",
            )}
          >
            {group.initials}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
                {group.ownerName}
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {group.propertyCount}{" "}
                {group.propertyCount === 1 ? "property" : "properties"}
              </span>
              {group.alertCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  <Bell className="h-3 w-3" />
                  {group.alertCount}{" "}
                  {group.alertCount === 1 ? "alert" : "alerts"}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11.5px] text-slate-500 dark:text-slate-400">
              {group.totalValueFormatted} · {group.rentedCount} rented /{" "}
              {group.vacantCount} vacant · {group.occupancyRate}% occupancy ·{" "}
              {group.avgProgress}% avg progress
            </p>
          </div>
        </button>

        {/* View portfolio — opens this owner's full portfolio page. The own
            book uses the OWN_PORTFOLIO_ID segment, which the portfolio route
            already resolves to the manager's directly-held properties. */}
        <Link
          href={`/pro/clients/${group.ownerId}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
            isOwn
              ? "text-blue-700 hover:bg-blue-100/60 dark:text-blue-400 dark:hover:bg-blue-900/30"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
        >
          View portfolio
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Expanded but nothing to show — e.g. a brand-new manager's own book. */}
      {expanded && rows.length === 0 && (
        <p className="border-t border-slate-100 py-3 pl-[52px] pr-4 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No properties yet — use{" "}
          <span className="font-medium text-slate-600 dark:text-slate-300">
            Add Property
          </span>{" "}
          to add your first one.
        </p>
      )}

      {/* ─── Nested property rows (only when expanded) ─────────────────── */}
      {expanded && rows.length > 0 && (
        <table className="w-full text-left">
          <tbody>
            {rows.map((property, index) => (
              <EnterTr
                key={property.id}
                index={index}
                onClick={() => router.push(`/property/${property.id}?orgId=${encodeURIComponent(property.orgId)}`)}
                className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/60 active:bg-slate-100/70 dark:border-slate-800 dark:hover:bg-slate-800/40"
              >
                {/* Indented to sit under the owner avatar; the Client column
                    from the flat table is dropped — the band already says who. */}
                <td className="w-[40%] py-2.5 pl-[52px] pr-3">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {property.name}
                    </span>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                      {property.addressLabel}
                    </span>
                  </div>
                </td>
                <td className="w-[13%] py-2.5 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      TYPE_PILL[property.type],
                    )}
                  >
                    {property.type}
                  </span>
                </td>
                <td className="w-[13%] py-2.5 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_PILL[property.status],
                    )}
                  >
                    {property.status}
                  </span>
                </td>
                <td className="w-[20%] py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <DrawInBar
                      percent={property.progress}
                      delaySeconds={0.1 + index * 0.03}
                      trackClassName="flex-1"
                      fillClassName={cn(
                        property.progress >= 67
                          ? "bg-emerald-500"
                          : property.progress >= 34
                            ? "bg-amber-500"
                            : "bg-red-500",
                      )}
                    />
                    <span className="text-[11.5px] tabular-nums text-slate-500 dark:text-slate-400">
                      {property.progress}%
                    </span>
                  </div>
                </td>
                <td className="w-[14%] py-2.5 pr-3 text-right text-[13px] font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {property.valueFormatted}
                </td>
                <td className="w-[10%] py-2.5 pr-4 text-[12px] text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(property.updatedAt)}
                </td>
              </EnterTr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
