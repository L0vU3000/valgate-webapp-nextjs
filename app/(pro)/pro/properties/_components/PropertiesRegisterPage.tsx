"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Search,
  Plus,
  CheckSquare,
  ChevronDown,
  Upload,
} from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { EnterTr, DrawInBar } from "@/app/(pro)/pro/_components/motion-primitives";
import {
  TYPE_PILL,
  STATUS_PILL,
} from "@/app/(pro)/pro/dashboard/_components/AssetsTable";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/components/ui/utils";
import type { ProPropertiesData, ProPropertyRow } from "@/app/(pro)/pro/queries";
import { AddPropertyFlowPro } from "@/app/(pro)/pro/_components/AddPropertyFlowPro";
import { PropertyOwnerBand } from "./PropertyOwnerBand";
import { BulkAssignModal } from "./BulkAssignModal";
import { CsvImportModal } from "./CsvImportModal";
import { proPrimaryButtonClass } from "@/app/(pro)/pro/_components/pro-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The cross-client Properties register. Two views over the same real
// properties:
//   • "Group by owner" (default) — one collapsible band per owner, My
//     Portfolio pinned first, each band summarising that owner's book and
//     linking into their full portfolio. Answers "whose is what".
//   • "Flat list" — the ungrouped, sortable table with a Client column and
//     multi-select, kept for cross-owner bulk actions (assign to client,
//     CSV import). Answers "everything at once".
// Filters (search / type / status) run client-side over the server-derived
// rows in both views; the summary KPIs come from the query layer.

const COLUMNS = [
  { label: "", width: "w-[3%]" },
  { label: "Property", width: "w-[27%]" },
  { label: "Type", width: "w-[12%]" },
  { label: "Client", width: "w-[16%]" },
  { label: "Status", width: "w-[12%]" },
  { label: "Progress", width: "w-[14%]" },
  { label: "Value", width: "w-[10%]" },
  { label: "Updated", width: "w-[6%]" },
] as const;

type ViewMode = "group" | "flat";

export function PropertiesRegisterPage({ data }: { data: ProPropertiesData }) {
  const router = useRouter();
  const { properties, groups, clients, summary } = data;

  const [viewMode, setViewMode] = useState<ViewMode>("group");
  // Collapsed on load: bands start closed so the page opens as a scannable
  // owner overview. A Set of the ownerIds that are currently expanded.
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  // Whether any of the shared filters (search / type / status) is narrowing
  // the set. Used to decide whether an empty My Portfolio band still shows.
  const hasSharedFilter =
    search.trim() !== "" || type !== "all" || status !== "all";

  // One predicate, shared by both views. The client filter only applies in
  // flat mode — grouping replaces it in group mode.
  const rowMatches = (row: ProPropertyRow, useClientFilter: boolean) => {
    if (useClientFilter && clientId !== "all" && row.clientId !== clientId) {
      return false;
    }
    if (type !== "all" && row.type !== type) return false;
    if (status !== "all" && row.status !== status) return false;
    const query = search.trim().toLowerCase();
    if (query !== "") {
      const haystack =
        `${row.name} ${row.addressLabel} ${row.clientName}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  };

  // Flat view: every matching row, Client column included.
  const visible = useMemo(
    () => properties.filter((property) => rowMatches(property, true)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [properties, search, clientId, type, status],
  );

  // Group view: each band with its filtered rows. A band is shown when it has
  // at least one matching row — except My Portfolio, which stays visible while
  // no filter is active so a manager with an empty own book still sees it.
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          group,
          rows: group.properties.filter((row) => rowMatches(row, false)),
        }))
        .filter(
          ({ group, rows }) =>
            rows.length > 0 || (group.isOwnPortfolio && !hasSharedFilter),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, search, type, status],
  );

  // Average record completeness across the whole book — a quick read on how
  // complete the data is.
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
    { value: String(summary.rented), label: "Rented", subLabel: "Currently leased" },
    { value: String(summary.vacant), label: "Vacant", subLabel: "Awaiting a tenant" },
    {
      value: `${avgProgress}%`,
      label: "Avg. Progress",
      subLabel: "Record completeness",
    },
  ];

  const filterSelectClass =
    "h-8 rounded-md border border-slate-200 bg-white px-2 text-[12.5px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-500/30";

  // Expand / collapse a single owner band.
  const toggleOwner = (ownerId: string) => {
    setExpandedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  };

  // "Collapse all" once every visible band is open, otherwise "Expand all".
  const allExpanded =
    visibleGroups.length > 0 &&
    visibleGroups.every(({ group }) => expandedOwners.has(group.ownerId));
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedOwners(new Set());
    } else {
      setExpandedOwners(new Set(visibleGroups.map(({ group }) => group.ownerId)));
    }
  };

  // Segmented Group ⇄ Flat control.
  const segBase =
    "h-7 rounded px-2.5 text-[11.5px] font-medium transition-colors";
  const segActive = "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100";
  const segIdle = "text-slate-500 hover:text-slate-700 dark:text-slate-400";

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100/70 p-0.5 dark:border-slate-700 dark:bg-slate-800/60">
        <button
          type="button"
          onClick={() => setViewMode("group")}
          className={cn(segBase, viewMode === "group" ? segActive : segIdle)}
        >
          Group by owner
        </button>
        <button
          type="button"
          onClick={() => setViewMode("flat")}
          className={cn(segBase, viewMode === "flat" ? segActive : segIdle)}
        >
          Flat list
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(proPrimaryButtonClass, "gap-1.5")}>
            <Plus className="h-3.5 w-3.5" />
            Add Property
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setAddFlowOpen(true)}>
            <Plus className="h-4 w-4" />
            Single property
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCsvImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import from CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

      {/* Client filter only makes sense in flat mode — grouping replaces it. */}
      {viewMode === "flat" && (
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
      )}

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

      {/* Collapse/expand all — group mode only. */}
      {viewMode === "group" && visibleGroups.length > 0 && (
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      )}

      {/* Bulk-select actions — flat mode only. */}
      {viewMode === "flat" && selectedIds.size > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedIds.size} selected
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setBulkAssignOpen(true)}>
              <CheckSquare className="h-4 w-4" />
              Assign to client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

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
            Your portfolio and every client, organised by owner
          </p>
        </header>

        <KpiMetricStrip metrics={metrics} ariaLabel="Property register metrics" />

        <WidgetCard
          title={viewMode === "group" ? "Properties by owner" : "All Properties"}
          headerRight={headerRight}
        >
          {viewMode === "group" ? (
            // ─── Grouped by owner ─────────────────────────────────────────
            <div className="-mx-5 -mb-5 border-t border-slate-200 dark:border-slate-800">
              {visibleGroups.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
                  {properties.length === 0
                    ? "No properties under management yet."
                    : "No properties match these filters."}
                </div>
              ) : (
                visibleGroups.map(({ group, rows }) => (
                  <PropertyOwnerBand
                    key={group.ownerId}
                    group={group}
                    rows={rows}
                    expanded={expandedOwners.has(group.ownerId)}
                    onToggle={() => toggleOwner(group.ownerId)}
                  />
                ))
              )}
            </div>
          ) : (
            // ─── Flat list ────────────────────────────────────────────────
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="w-[3%] py-2 pr-3">
                        <input
                          ref={(el) => {
                            if (el)
                              el.indeterminate =
                                selectedIds.size > 0 &&
                                selectedIds.size < visible.length;
                          }}
                          type="checkbox"
                          checked={
                            visible.length > 0 &&
                            selectedIds.size === visible.length
                          }
                          onChange={() => {
                            if (selectedIds.size === visible.length) {
                              setSelectedIds(new Set());
                            } else {
                              setSelectedIds(new Set(visible.map((p) => p.id)));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          aria-label="Select all properties"
                        />
                      </th>
                      {COLUMNS.slice(1).map((col) => (
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
                        className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60 active:bg-slate-100/70 dark:border-slate-800 dark:hover:bg-slate-800/40 dark:active:bg-slate-800/70"
                      >
                        <td className="w-[3%] py-3 pr-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(property.id)}
                            onChange={() => {
                              const next = new Set(selectedIds);
                              if (next.has(property.id)) next.delete(property.id);
                              else next.add(property.id);
                              setSelectedIds(next);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`Select ${property.name}`}
                          />
                        </td>
                        <td
                          className="cursor-pointer py-3 pr-3"
                          onClick={() => router.push(`/property/${property.id}`)}
                        >
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
                The register loads and renders EVERY property the manager owns —
                no row cap, nothing silently truncated. This line states the
                exact count and reads "X of Y" whenever a filter narrows it.
              */}
              {properties.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {visible.length === properties.length
                    ? `Showing all ${properties.length} ${properties.length === 1 ? "property" : "properties"}`
                    : `Showing ${visible.length} of ${properties.length} properties`}
                </div>
              )}
            </>
          )}
        </WidgetCard>
      </div>

      <AddPropertyFlowPro
        clients={clients}
        open={addFlowOpen}
        onOpenChange={setAddFlowOpen}
      />

      <CsvImportModal
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        clients={clients}
        onComplete={() => router.refresh()}
      />

      <BulkAssignModal
        open={bulkAssignOpen}
        onOpenChange={(open) => {
          setBulkAssignOpen(open);
          if (!open) setSelectedIds(new Set());
        }}
        selectedPropertyIds={Array.from(selectedIds)}
        clients={clients}
        onComplete={() => {
          setSelectedIds(new Set());
          setBulkAssignOpen(false);
          router.refresh();
        }}
      />
    </main>
  );
}
