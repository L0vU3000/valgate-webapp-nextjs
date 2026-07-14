"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, List, X, Filter } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { progressClass, TYPE_ICON, TYPE_COLOR, TYPE_LABEL } from "@/lib/property-helpers";
import type { PropertyStatus, PropertyTypeChoice } from "@/lib/data/types/property";
import type { HomeProperty } from "@/app/(shell)/queries";

// Fixed display order for the filter chips. We only render the ones that actually
// occur in the current property set, but keeping a stable order avoids the chips
// jumping around as the data changes.
const STATUS_ORDER: PropertyStatus[] = [
  "Rented",
  "Vacant",
  "For Sale",
  "Owner-Occupied",
  "Sold",
  "Archived",
];
const TYPE_ORDER: PropertyTypeChoice[] = [
  "residential",
  "commercial",
  "multi-unit",
  "retail",
  "land",
  "industrial",
  "construction",
  "other",
];

// A small colored dot per property status. Mirrors the status-pill colors used in
// the map detail drawer (Rented = emerald, Vacant = amber) so the two surfaces read
// the same. Anything else falls back to a neutral slate dot.
function statusDotColor(status: PropertyStatus): string {
  switch (status) {
    case "Rented":
      return "bg-emerald-500";
    case "Vacant":
      return "bg-amber-500";
    case "For Sale":
      return "bg-blue-500";
    case "Owner-Occupied":
      return "bg-violet-500";
    default:
      return "bg-slate-400";
  }
}

// Case-insensitive match on the fields a user would type to find a property:
// its name, its code, or its city. Empty query matches everything.
function matchesQuery(property: HomeProperty, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const name = property.name.toLowerCase();
  const code = property.code.toLowerCase();
  const city = (property.city ?? "").toLowerCase();
  return name.includes(needle) || code.includes(needle) || city.includes(needle);
}

// A toggle chip used in the filter panel. Filled when active.
function FilterChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-interactive-primary bg-brand-subtle text-interactive-primary"
          : "border-border-default text-secondary hover:bg-surface-tint hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// One compact, selectable row. Two lines:
//   line 1: a colored TYPE icon (what kind of property it is) + name + a status dot
//   line 2: progress % + city
// The type icon is the primary "what is this" signal; the status dot (right) tells
// you Rented/Vacant at a glance. No thumbnail — this is a fast-scan table.
function RailRow({
  property,
  selected,
  onSelect,
}: {
  property: HomeProperty;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected) {
      buttonRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  const location = [property.city, property.province].filter(Boolean).join(", ");
  const TypeIcon = TYPE_ICON[property.type];

  return (
    <li>
      <button
        ref={buttonRef}
        onClick={() => onSelect(property.id)}
        className={cn(
          "group relative w-full text-left px-3 py-2.5 flex flex-col gap-1 transition-colors duration-150",
          selected ? "bg-brand-subtle" : "hover:bg-surface-tint",
        )}
      >
        {/* Left accent bar on the selected row */}
        {selected && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-interactive-primary" />
        )}

        <div className="flex items-center gap-2 min-w-0">
          {/* Type icon — the primary "what kind of property" signal */}
          <span
            className={cn("flex size-6 items-center justify-center rounded-md shrink-0", TYPE_COLOR[property.type])}
            title={TYPE_LABEL[property.type]}
          >
            <TypeIcon className="size-3.5" />
          </span>
          <span className="text-sm font-medium text-foreground truncate">{property.name}</span>
          {/* Status dot (Rented / Vacant / …) */}
          <span
            className={cn("ml-auto size-2 rounded-full shrink-0", statusDotColor(property.status))}
            title={property.status}
          />
        </div>

        <div className="flex items-center gap-2 pl-8 min-w-0">
          <span className={cn("text-xs font-semibold tabular-nums", progressClass(property.progress))}>
            {property.progress}%
          </span>
          <span className="text-xs text-secondary truncate">{location || "—"}</span>
        </div>
      </button>
    </li>
  );
}

// The shared body of the rail: a search box + filter button on top, the filtered
// list below. Reused by both the desktop rail and the mobile bottom sheet.
function RailBody({
  properties,
  selectedId,
  onSelect,
  query,
  setQuery,
  statusFilter,
  toggleStatus,
  typeFilter,
  toggleType,
  clearFilters,
}: {
  properties: HomeProperty[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: Set<PropertyStatus>;
  toggleStatus: (status: PropertyStatus) => void;
  typeFilter: Set<PropertyTypeChoice>;
  toggleType: (type: PropertyTypeChoice) => void;
  clearFilters: () => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  // Only offer filter chips for statuses / types that actually occur in the data.
  const availableStatuses = useMemo(
    () => STATUS_ORDER.filter((s) => properties.some((p) => p.status === s)),
    [properties],
  );
  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((t) => properties.some((p) => p.type === t)),
    [properties],
  );

  const activeCount = statusFilter.size + typeFilter.size;

  const filtered = properties.filter(
    (p) =>
      matchesQuery(p, query) &&
      (statusFilter.size === 0 || statusFilter.has(p.status)) &&
      (typeFilter.size === 0 || typeFilter.has(p.type)),
  );

  return (
    <>
      {/* Search + filter */}
      <div className="p-2.5 border-b border-border-default shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-surface-sunken px-2.5 h-9 focus-within:ring-2 focus-within:ring-interactive-primary/30 transition-shadow">
            <Search className="size-4 text-secondary shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a property…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-secondary outline-none min-w-0"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="shrink-0 text-secondary hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle — badge shows the number of active filters */}
          <button
            onClick={() => setFilterOpen((open) => !open)}
            aria-label="Filter properties"
            aria-expanded={filterOpen}
            className={cn(
              "relative flex items-center justify-center size-9 rounded-lg border shrink-0 transition-colors",
              activeCount > 0 || filterOpen
                ? "border-interactive-primary/40 bg-brand-subtle text-interactive-primary"
                : "border-border-default text-secondary hover:bg-surface-tint hover:text-foreground",
            )}
          >
            <Filter className="size-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-interactive-primary text-white text-[10px] font-semibold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div className="rounded-lg border border-border-default bg-surface-base p-2.5 space-y-3">
            {availableStatuses.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableStatuses.map((status) => (
                    <FilterChip
                      key={status}
                      label={status}
                      active={statusFilter.has(status)}
                      onToggle={() => toggleStatus(status)}
                    />
                  ))}
                </div>
              </div>
            )}

            {availableTypes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableTypes.map((type) => (
                    <FilterChip
                      key={type}
                      label={TYPE_LABEL[type]}
                      active={typeFilter.has(type)}
                      onToggle={() => toggleType(type)}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-interactive-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-secondary">No properties match.</div>
        ) : (
          <ul className="py-1">
            {filtered.map((property) => (
              <RailRow
                key={property.id}
                property={property}
                selected={property.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/**
 * Left-docked, collapsible property list that floats over the home map.
 *
 * - Desktop (sm+): a floating rail on the left. It collapses off-canvas to the left,
 *   leaving a small "Properties" handle; the collapse chevron sits on the rail's RIGHT
 *   edge (komoot pattern). Selecting a row is wired by the parent to fly the map to that
 *   property and open its detail drawer.
 * - Mobile: a floating "Properties" button that opens a bottom sheet with the same list.
 *
 * The rail is a pure locator — the rich per-property detail still lives in the map's
 * right-hand drawer, unchanged.
 */
export function PropertyRail({
  properties,
  selectedId,
  onSelect,
  open,
  onToggle,
}: {
  properties: HomeProperty[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<PropertyStatus>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<PropertyTypeChoice>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

  // Toggle a value in a filter set immutably (new Set so React re-renders).
  const toggleStatus = (status: PropertyStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };
  const toggleType = (type: PropertyTypeChoice) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };
  const clearFilters = () => {
    setStatusFilter(new Set());
    setTypeFilter(new Set());
  };

  // On mobile, picking a property also closes the sheet so the map + detail are visible.
  const handleMobileSelect = (id: string) => {
    onSelect(id);
    setMobileOpen(false);
  };

  const bodyProps = {
    properties,
    selectedId,
    query,
    setQuery,
    statusFilter,
    toggleStatus,
    typeFilter,
    toggleType,
    clearFilters,
  };

  return (
    <>
      {/* ---- Desktop rail ----
          Outer wrapper owns position + width + the collapse translate, and does NOT
          clip, so the collapse chevron on its right edge stays visible. The inner card
          owns the rounded corners + overflow-hidden that clip the scrolling list.
          When collapsed we translate a fixed distance well past the left edge. */}
      <div
        data-no-drag
        className={cn(
          "hidden sm:block absolute z-20 left-4 top-4 bottom-4 w-72",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "-translate-x-96",
        )}
      >
        <div className="relative h-full flex flex-col overflow-hidden rounded-xl bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-default shrink-0">
            <List className="size-4 text-interactive-primary" />
            <h2 className="text-sm font-semibold text-foreground">Properties</h2>
            <span className="text-xs text-secondary tabular-nums">{properties.length}</span>
          </div>

          <RailBody {...bodyProps} onSelect={onSelect} />
        </div>

        {/* Collapse chevron — pinned to the rail's right edge (outside the clipped card) */}
        <button
          onClick={onToggle}
          aria-label="Collapse property list"
          className="absolute top-1/2 -translate-y-1/2 -right-3 size-6 rounded-full bg-surface-base border border-border-default shadow-sm flex items-center justify-center hover:bg-surface-tint transition-colors"
        >
          <ChevronLeft className="size-3.5 text-secondary" />
        </button>
      </div>

      {/* ---- Desktop reopen handle (only when collapsed) ---- */}
      {!open && (
        <button
          onClick={onToggle}
          aria-label="Show property list"
          className="hidden sm:flex absolute z-20 left-4 top-4 h-10 items-center gap-1.5 rounded-full bg-surface-base border border-border-default shadow-sm px-3 hover:bg-surface-tint transition-colors"
        >
          <List className="size-4 text-interactive-primary" />
          <span className="text-sm font-medium text-foreground">Properties</span>
          <ChevronRight className="size-3.5 text-secondary" />
        </button>
      )}

      {/* ---- Mobile trigger ---- */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sm:hidden absolute z-20 left-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] flex items-center gap-1.5 rounded-full bg-surface-base border border-border-default shadow-lg px-3.5 py-2"
      >
        <List className="size-4 text-interactive-primary" />
        <span className="text-sm font-medium text-foreground">Properties</span>
      </button>

      {/* ---- Mobile bottom sheet ---- */}
      {mobileOpen && (
        <div className="sm:hidden absolute inset-0 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 h-[70dvh] rounded-t-2xl bg-surface-base border-t border-border-default flex flex-col overflow-hidden [animation:slide-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
              <h2 className="text-base font-semibold text-foreground">Properties</h2>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
                className="size-7 rounded-full bg-surface-sunken flex items-center justify-center hover:bg-surface-tint transition-colors"
              >
                <X className="size-4 text-secondary" />
              </button>
            </div>
            <RailBody {...bodyProps} onSelect={handleMobileSelect} />
          </div>
        </div>
      )}
    </>
  );
}
