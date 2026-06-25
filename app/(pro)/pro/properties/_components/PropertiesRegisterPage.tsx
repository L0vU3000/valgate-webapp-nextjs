"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import {
  EnterTr,
  DrawInBar,
} from "@/app/(pro)/pro/_components/motion-primitives";
import {
  TYPE_PILL,
  STATUS_PILL,
} from "@/app/(pro)/pro/dashboard/_components/AssetsTable";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProPropertiesData } from "@/app/(pro)/pro/queries";

// The cross-client Properties register — the manager's whole book of
// real estate in one filterable list. Every row is a real Property;
// filters (search / client / type / status) run client-side over the
// server-derived rows, and the summary KPIs come from the query layer.

const COLUMNS = [
  { label: "Property", width: "w-[30%]" },
  { label: "Type", width: "w-[12%]" },
  { label: "Client", width: "w-[16%]" },
  { label: "Status", width: "w-[12%]" },
  { label: "Progress", width: "w-[14%]" },
  { label: "Value", width: "w-[10%]" },
  { label: "Updated", width: "w-[6%]" },
] as const;

export function PropertiesRegisterPage({
  data,
}: {
  data: ProPropertiesData;
}) {
  const router = useRouter();
  const { properties, clients, summary } = data;

  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  // The distinct types and statuses actually present, so the filter
  // dropdowns never offer an option that would return nothing.
  const typeOptions = useMemo(
    () => Array.from(new Set(properties.map((p) => p.type))).sort(),
    [properties],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(properties.map((p) => p.status))).sort(),
    [properties],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return properties.filter((property) => {
      if (clientId !== "all" && property.clientId !== clientId) return false;
      if (type !== "all" && property.type !== type) return false;
      if (status !== "all" && property.status !== status) return false;
      if (query !== "") {
        const haystack =
          `${property.name} ${property.addressLabel} ${property.clientName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [properties, search, clientId, type, status]);

  // Average record completeness (the Progress pillar score) across the
  // whole book — a quick read on how complete the data is.
  const avgProgress =
    properties.length === 0
      ? 0
      : Math.round(
          properties.reduce((sum, p) => sum + p.progress, 0) /
            properties.length,
        );

  const metrics = [
    {
      value: String(summary.totalCount),
      label: "Properties",
      subLabel: `${summary.activeCount} active`,
    },
    {
      value: summary.totalValueFormatted,
      label: "Portfolio Value",
      subLabel: "Active properties",
    },
    {
      value: String(summary.rented),
      label: "Rented",
      subLabel: "Currently leased",
    },
    {
      value: String(summary.vacant),
      label: "Vacant",
      subLabel: "Awaiting a tenant",
    },
    {
      value: `${avgProgress}%`,
      label: "Avg. Progress",
      subLabel: "Record completeness",
    },
  ];

  const filterSelectClass =
    "h-8 rounded-md border border-slate-200 bg-white px-2 text-[12.5px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-500/30";

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <header className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
            <span>Valgate Professional</span>
            <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Properties
            </span>
          </div>
          <h1 className="text-[28px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
            Properties
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            Every property under management, across all clients
          </p>
        </header>

        <KpiMetricStrip metrics={metrics} ariaLabel="Property register metrics" />

        <WidgetCard
          title="All Properties"
          headerRight={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search properties…"
                  className="h-8 w-[180px] rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[12.5px] text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                />
              </div>
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                aria-label="Filter by client"
                className={filterSelectClass}
              >
                <option value="all">All clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                aria-label="Filter by type"
                className={cn(filterSelectClass, "capitalize")}
              >
                <option value="all">All types</option>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
                className={filterSelectClass}
              >
                <option value="all">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
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
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400"
                    >
                      {/*
                        Distinguish "your book is empty" from "your filters
                        excluded everything", so an empty result never reads as
                        a bug when the cause is just an active filter.
                      */}
                      {properties.length === 0
                        ? "No properties under management yet."
                        : "No properties match these filters."}
                    </td>
                  </tr>
                )}
                {visible.map((property, index) => (
                  <EnterTr
                    key={property.id}
                    index={index}
                    onClick={() => router.push(`/property/${property.id}`)}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60 active:bg-slate-100/70 dark:border-slate-800 dark:hover:bg-slate-800/40 dark:active:bg-slate-800/70"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                          {property.name}
                        </span>
                        <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                          {property.addressLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                          TYPE_PILL[property.type],
                        )}
                      >
                        {property.type}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-[12px] text-slate-600 dark:text-slate-300">
                      {property.clientName}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATUS_PILL[property.status],
                        )}
                      >
                        {property.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <DrawInBar
                          percent={property.progress}
                          delaySeconds={0.15 + index * 0.03}
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
                    <td className="py-3 pr-3 text-[13px] font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {property.valueFormatted}
                    </td>
                    <td className="py-3 text-[12px] text-slate-500 dark:text-slate-400">
                      {formatRelativeTime(property.updatedAt)}
                    </td>
                  </EnterTr>
                ))}
              </tbody>
            </table>
          </div>

          {/*
            Result count. The register loads and renders EVERY property the
            manager owns — there is no row cap and nothing is silently
            truncated. This line always states the exact count so the user can
            trust the list is complete, and it reads "X of Y" whenever a filter
            is narrowing the full set.
          */}
          {properties.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {visible.length === properties.length
                ? `Showing all ${properties.length} ${properties.length === 1 ? "property" : "properties"}`
                : `Showing ${visible.length} of ${properties.length} properties`}
            </div>
          )}
        </WidgetCard>
      </div>
    </main>
  );
}
