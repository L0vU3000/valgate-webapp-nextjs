"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Info } from "lucide-react";
import { TYPE_ICON, TYPE_COLOR, TYPE_LABEL, typeBadgeClasses, statusBadgeClasses, titleBadgeClasses, progressDotColor } from "../../lib/property-helpers";
import type { PropertyListItem } from "@/lib/data/types/property";
import { restorePropertyAction } from "@/app/(shell)/property/actions";
import { toast } from "sonner";
import { ProgressModal } from "./ProgressModal";
import { ProgressExplainerModal } from "./ProgressExplainerModal";
import { PropertyMobileCard } from "./PropertyMobileCard";
import { useDismissable } from "@/lib/hooks/use-dismissable";

export type SortKey = "name" | "province" | "status" | "size" | "buy" | "progress"

function SortableHeader({
  label, sortK, current, dir, onSort, align = "left",
}: {
  label: string
  sortK: SortKey
  current: SortKey | null
  dir: "asc" | "desc"
  onSort: (k: SortKey) => void
  align?: "left" | "right"
}) {
  const active = current === sortK
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown
  return (
    <button
      onClick={() => onSort(sortK)}
      className={`group flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] hover:text-val-heading transition-colors duration-150 select-none ${align === "right" ? "ml-auto" : ""}`}
    >
      {label}
      <Icon
        className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-150 ${
          active
            ? "text-[--val-primary-dark] opacity-100"
            : "text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-slate-600"
        }`}
      />
    </button>
  )
}

export interface TableAnimationConfig {
  containerDuration: number;
  containerDelay: number;
  rowDuration: number;
  rowStagger: number;
  progressBarDelay: number;
  progressBarStagger: number;
}

const DEFAULT_ANIMATION_CONFIG: TableAnimationConfig = {
  containerDuration: 250,
  containerDelay: 0,
  rowDuration: 400,
  rowStagger: 25,
  progressBarDelay: 100,
  progressBarStagger: 30,
};

interface PropertyTableProps {
  pageRows: PropertyListItem[];
  pageStart: number;
  filtered: PropertyListItem[];
  properties: PropertyListItem[];
  mounted: boolean;
  navigate: (path: string) => void;
  totalPages: number;
  safePage: number;
  goToPage: (page: number) => void;
  onClearFilters: () => void;
  animationConfig?: TableAnimationConfig;
  showArchived?: boolean;
  showProgressExplainer?: boolean;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}

export function PropertyTable({
  pageRows,
  pageStart,
  filtered,
  properties,
  mounted,
  navigate,
  totalPages,
  safePage,
  goToPage,
  onClearFilters,
  animationConfig,
  showArchived = false,
  showProgressExplainer = true,
  sortKey,
  sortDir,
  onSort,
}: PropertyTableProps) {
  const cfg = animationConfig ?? DEFAULT_ANIMATION_CONFIG;
  const [progressProperty, setProgressProperty] = useState<PropertyListItem | null>(null);
  const [explainerForcedOpen, setExplainerForcedOpen] = useState(false);
  const { visible: showExplainerOnce, dismiss: dismissExplainerOnce } = useDismissable("vg_progress_explainer_seen", { delay: 800 });
  const showExplainer = showProgressExplainer && (showExplainerOnce || explainerForcedOpen);
  const handleCloseExplainer = () => { dismissExplainerOnce(); setExplainerForcedOpen(false); };

  // Pagination is identical on mobile and desktop, so we render it once
  // and reuse the JSX in both branches. Kept as a render helper rather than
  // a separate component because it closes over so many parent props.
  const renderPagination = () => (
    <div className="flex items-center justify-between px-4 py-4 bg-slate-50/60 border-t border-slate-200">
      <p className="text-[14px] text-slate-500" aria-live="polite" aria-atomic="true">
        {totalPages > 1 ? (
          <>
            Showing{" "}
            <span className="font-semibold text-val-heading">{pageStart + 1}–{pageStart + pageRows.length}</span>
            {" "}of{" "}
            <span className="font-semibold text-val-heading">{filtered.length}</span>
            {filtered.length < properties.length ? (
              <> filtered, <span className="font-semibold text-val-heading">{properties.length}</span> total</>
            ) : " properties"}
          </>
        ) : (
          <>
            <span className="font-semibold text-val-heading">{filtered.length}</span>
            {filtered.length < properties.length && (
              <>{" "}of{" "}<span className="font-semibold text-val-heading">{properties.length}</span></>
            )}
            {" "}properties
          </>
        )}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={safePage === 1}
            onClick={() => goToPage(safePage - 1)}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button className="px-3 py-1 rounded text-white text-[14px] font-semibold min-w-[32px] shadow-sm" style={{ background: "var(--val-primary-dark)" }}>
            {safePage}
          </button>
          <button
            disabled={safePage === totalPages}
            onClick={() => goToPage(safePage + 1)}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
    <ProgressModal property={progressProperty} onClose={() => setProgressProperty(null)} />
    <ProgressExplainerModal open={showExplainer} onClose={handleCloseExplainer} />

    {/* Mobile branch — stacked card list. Hidden on `sm:` and above. */}
    <div
      className="sm:hidden flex flex-col"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-8px)",
        transition: `opacity ${cfg.containerDuration}ms cubic-bezier(0.25,1,0.5,1), transform ${cfg.containerDuration}ms cubic-bezier(0.25,1,0.5,1)`,
        transitionDelay: `${cfg.containerDelay}ms`,
      }}
    >
      {pageRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 px-6 text-center">
          <p className="text-[14px] text-slate-400">
            {showArchived ? "No archived properties." : "No properties match your filters."}
          </p>
          {!showArchived && (
            <button
              onClick={onClearFilters}
              className="mt-3 text-[14px] text-blue-600 font-medium hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pageRows.map((p, i) => (
            <PropertyMobileCard
              key={p.id}
              property={p}
              rowIndex={i}
              mounted={mounted}
              cfg={cfg}
              showArchived={showArchived}
              navigate={navigate}
              onClickProgress={setProgressProperty}
            />
          ))}
        </div>
      )}

      {/* Pagination — sits inside its own card container on mobile so the
          stacked list above doesn't visually merge with the controls. */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
        {renderPagination()}
      </div>
    </div>

    {/* Desktop branch — original table layout. Hidden below `sm:`. */}
    <div
      className="hidden sm:block bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-8px)",
        transition: `opacity ${cfg.containerDuration}ms cubic-bezier(0.25,1,0.5,1), transform ${cfg.containerDuration}ms cubic-bezier(0.25,1,0.5,1)`,
        transitionDelay: `${cfg.containerDelay}ms`,
      }}
    >
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-4 px-3 w-10">
                <input type="checkbox" aria-label="Select all properties" className="rounded border-slate-300 accent-blue-600" />
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] w-[48px]">
                #
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]" aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                <SortableHeader label="Name" sortK="name" current={sortKey} dir={sortDir} onSort={onSort} />
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Type
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]" aria-sort={sortKey === "province" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                <SortableHeader label="Province" sortK="province" current={sortKey} dir={sortDir} onSort={onSort} />
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]" aria-sort={sortKey === "status" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                <SortableHeader label="Status" sortK="status" current={sortKey} dir={sortDir} onSort={onSort} />
              </th>
              <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]" aria-sort={sortKey === "size" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                <SortableHeader label="Size" sortK="size" current={sortKey} dir={sortDir} onSort={onSort} align="right" />
              </th>
              <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]" aria-sort={sortKey === "buy" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                <SortableHeader label="Buy" sortK="buy" current={sortKey} dir={sortDir} onSort={onSort} align="right" />
              </th>
              <th className="text-center py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Title
              </th>
              <th className="text-center py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]" aria-sort={!showArchived && sortKey === "progress" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                {showArchived ? "Action" : (
                  <div className="flex items-center gap-1 justify-center">
                    <SortableHeader label="Progress" sortK="progress" current={sortKey} dir={sortDir} onSort={onSort} />
                    <button
                      onClick={(e) => { e.stopPropagation(); setExplainerForcedOpen(true); }}
                      className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors duration-150 ml-0.5"
                      aria-label="What is Progress?"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <p className="text-[14px] text-slate-400">
                    {showArchived ? "No archived properties." : "No properties match your filters."}
                  </p>
                  {!showArchived && (
                    <button
                      onClick={onClearFilters}
                      className="mt-3 text-[14px] text-blue-600 font-medium hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((p, i) => {
                const TypeIcon = TYPE_ICON[p.type];
                const typeColor = TYPE_COLOR[p.type];
                const hDot = progressDotColor(p.progress);
                const progressTextColor = p.progress >= 80 ? "text-emerald-600" : p.progress >= 50 ? "text-amber-500" : "text-red-400";
                const rowIsArchived = showArchived || !!p.isArchived;
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-slate-100 transition-colors duration-150 ${
                      rowIsArchived
                        ? "opacity-60"
                        : "hover:bg-blue-50/30 cursor-pointer group"
                    }`}
                    aria-label={rowIsArchived ? p.name : `View ${p.name}`}
                    tabIndex={rowIsArchived ? undefined : 0}
                    role={rowIsArchived ? undefined : "link"}
                    onClick={rowIsArchived ? undefined : () => navigate(`/property/${p.id}`)}
                    onKeyDown={rowIsArchived ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/property/${p.id}`); } }}
                    style={{
                      opacity: mounted ? (rowIsArchived ? 0.6 : 1) : 0,
                      transform: mounted ? "translateY(0)" : "translateY(-6px)",
                      transition: `opacity ${cfg.rowDuration}ms cubic-bezier(0.25,1,0.5,1), transform ${cfg.rowDuration}ms cubic-bezier(0.25,1,0.5,1)`,
                      transitionDelay: `${cfg.containerDelay + i * cfg.rowStagger}ms`,
                    }}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        className="rounded border-slate-300 accent-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Row # */}
                    <td className="py-3 px-3 text-[12px] text-slate-400">
                      {pageStart + i + 1}
                    </td>

                    {/* Property — thumbnail + name + code */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${typeColor} ${rowIsArchived ? "" : "transition-transform duration-200 group-hover:scale-105"}`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] text-val-heading font-medium leading-tight truncate" title={p.name}>{p.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${typeBadgeClasses(p.type)}`}>
                        {TYPE_LABEL[p.type]}
                      </span>
                    </td>

                    {/* Province */}
                    <td className="py-3 px-3 text-[14px] text-slate-700">{p.province}</td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${statusBadgeClasses(p.status)}`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-3 text-right text-[14px] text-slate-600">
                      {p.totalArea ? `${Number(p.totalArea).toLocaleString()} m²` : "—"}
                    </td>

                    {/* Buy */}
                    <td className="py-3 px-3 text-right text-[14px] font-medium text-slate-900">
                      {p.buy}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-3 text-center">
                      {p.title === "—" ? (
                        <span className="text-slate-400">&mdash;</span>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${titleBadgeClasses(p.title)}`}>
                          {p.title}
                        </span>
                      )}
                    </td>

                    {/* Progress / Action */}
                    <td className="py-3 px-3 text-center">
                      {rowIsArchived ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const result = await restorePropertyAction(p.id);
                            if (result.ok) toast.success("Property restored");
                          }}
                          className="px-3 py-1.5 text-[12px] font-semibold text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors duration-150"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          aria-label={`Progress ${p.progress}% — click to see details`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.progressDetails) setProgressProperty(p);
                          }}
                          className="inline-flex flex-col items-center gap-1.5 rounded-md px-3 py-2 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 active:bg-blue-100/40 transition-all duration-150 group mx-auto min-w-[68px]"
                        >
                          <span className={`text-[13px] font-bold tabular-nums leading-none transition-colors duration-150 group-hover:text-blue-700 ${progressTextColor}`}>
                            {p.progress}%
                          </span>
                          <div className="w-full h-[4px] bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${hDot} transition-[width] duration-700 ease-out`}
                              style={{
                                width: mounted ? `${p.progress}%` : "0%",
                                transitionDelay: `${cfg.containerDelay + cfg.progressBarDelay + i * cfg.progressBarStagger}ms`,
                              }}
                            />
                          </div>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — shared between mobile and desktop via the helper. */}
      {renderPagination()}
    </div>
    </>
  );
}
