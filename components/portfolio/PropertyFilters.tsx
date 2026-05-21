"use client";

import { ChevronDown, X } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { TYPE_LABEL } from "@/lib/property-helpers";
import type { PropertyStatus } from "@/lib/data/types/property";

interface FilterOption {
  value: string;
  label: string;
  dot?: string;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: "All",      label: "Any Status" },
  { value: "Rented",   label: "Rented",   dot: "bg-emerald-500" },
  { value: "Vacant",   label: "Vacant",   dot: "bg-amber-500"   },
  { value: "For Sale", label: "For Sale", dot: "bg-blue-500"    },
  { value: "Sold",     label: "Sold",     dot: "bg-slate-400"   },
];

const TYPE_DOT: Record<string, string> = {
  residential:  "bg-orange-400",
  commercial:   "bg-blue-400",
  "multi-unit": "bg-purple-400",
  retail:       "bg-pink-400",
  land:         "bg-emerald-400",
  industrial:   "bg-sky-400",
  construction: "bg-amber-400",
  other:        "bg-indigo-400",
};

const TYPE_OPTIONS: FilterOption[] = [
  { value: "Property Type", label: "All Types" },
  ...Object.entries(TYPE_LABEL).map(([key, label]) => ({
    value: key,
    label,
    dot: TYPE_DOT[key],
  })),
];

interface PropertyFiltersProps {
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  statusFilter: PropertyStatus | null;
  setStatusFilter: (v: PropertyStatus | null) => void;
  provinceFilter: string;
  setProvinceFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  setCurrentPage: (v: number) => void;
  mounted: boolean;
  provinces: string[];
}

function FilterSelect({
  value,
  onValueChange,
  options,
  defaultLabel,
  isActive,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: FilterOption[];
  defaultLabel: string;
  isActive: boolean;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        className={`
          group inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-[13px] font-medium
          transition-all duration-150 outline-none cursor-pointer select-none whitespace-nowrap
          focus-visible:ring-2 focus-visible:ring-[--val-primary-dark]/20 focus-visible:ring-offset-0
          data-[state=open]:ring-2 data-[state=open]:ring-[--val-primary-dark]/15
          data-[state=open]:border-[--val-primary-dark]/30
          ${
            isActive
              ? "border-[--val-primary-dark]/25 bg-[--val-primary-dark]/[0.06] text-[--val-primary-dark]"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50"
          }
        `}
      >
        <Select.Value placeholder={defaultLabel} />
        <Select.Icon asChild>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180 ${
              isActive ? "opacity-60" : "opacity-40"
            }`}
          />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md shadow-slate-900/[0.06] will-change-transform data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97]"
          position="popper"
          sideOffset={5}
          align="start"
        >
          <Select.Viewport className="p-1 max-h-[280px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:oklch(0.7_0.01_220)_transparent]">
            {options.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="relative flex cursor-pointer select-none items-center rounded-[5px] px-3 py-[7px] text-[13px] font-medium text-slate-700 outline-none transition-colors duration-100 data-[highlighted]:bg-slate-50 data-[highlighted]:text-slate-900 data-[state=checked]:text-[--val-primary-dark] data-[state=checked]:bg-[--val-primary-dark]/[0.05]"
              >
                <Select.ItemText>
                  <span className="flex items-center gap-2">
                    {opt.dot && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                    )}
                    {opt.label}
                  </span>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function PropertyFilters({
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  provinceFilter,
  setProvinceFilter,
  setCurrentPage,
  mounted,
  provinces,
}: PropertyFiltersProps) {
  const provinceOptions: FilterOption[] = provinces.map((p) => ({
    value: p,
    label: p === "All" ? "All Provinces" : p,
  }));

  const statusValue = statusFilter ?? "All";
  const isTypeActive = typeFilter !== "Property Type";
  const isStatusActive = statusFilter !== null;
  const isProvinceActive = provinceFilter !== "All";
  const hasActiveFilters = isTypeActive || isStatusActive || isProvinceActive;

  function clearAll() {
    setTypeFilter("Property Type");
    setStatusFilter(null);
    setProvinceFilter("All");
    setCurrentPage(1);
  }

  return (
    <div
      className="flex items-center gap-2 transition-all duration-500"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transitionDelay: "300ms",
      }}
    >
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em] mr-1">
        Filter
      </span>

      <FilterSelect
        value={provinceFilter}
        onValueChange={(v) => { setProvinceFilter(v); setCurrentPage(1); }}
        options={provinceOptions}
        defaultLabel="All Provinces"
        isActive={isProvinceActive}
      />

      <FilterSelect
        value={typeFilter}
        onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}
        options={TYPE_OPTIONS}
        defaultLabel="All Types"
        isActive={isTypeActive}
      />

      <FilterSelect
        value={statusValue}
        onValueChange={(v) => {
          setStatusFilter(v === "All" ? null : (v as PropertyStatus));
          setCurrentPage(1);
        }}
        options={STATUS_OPTIONS}
        defaultLabel="Any Status"
        isActive={isStatusActive}
      />

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[12px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150 active:scale-[0.97]"
          aria-label="Clear all filters"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
