"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Info, MoreHorizontal, Eye, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { TYPE_ICON, TYPE_COLOR, TYPE_LABEL, typeBadgeClasses, statusBadgeClasses, titleBadgeClasses, progressDotColor } from "../../lib/property-helpers";
import type { PropertyListItem } from "@/lib/data/types/property";
import {
  restorePropertyAction,
  archivePropertyAction,
  deletePropertyAction,
  getPropertyCascadeCountsAction,
} from "@/app/(shell)/property/actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  // Whether the current user may hard-delete (admin/owner). When false, the Delete row-action
  // is hidden. The server enforces the same rule independently — this is UI affordance only.
  canDelete?: boolean;
  // Re-fetch the page's server data after a mutation (archive/restore/delete) so the table
  // reflects the new state without a full reload. Wired to router.refresh() by the parent.
  refresh?: () => void;
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
  canDelete = false,
  refresh,
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
              {/* Row-actions column — narrow, holds the (…) kebab menu per row. */}
              <th className="py-4 px-3 w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-20 text-center">
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

                    {/* Row-actions (…) menu — View / Edit / Archive-or-Restore / Delete.
                        stopPropagation so opening the menu never triggers the row's navigate. */}
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        property={p}
                        isArchived={rowIsArchived}
                        canDelete={canDelete}
                        navigate={navigate}
                        refresh={refresh}
                      />
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

/* ── Row-actions (…) menu ──────────────────────────────────────────────────
   One kebab menu per portfolio row. Items adapt to the row's state:
     • active row   → View · Edit · Archive · (Delete, admin/owner only)
     • archived row → View · Edit · Restore · (Delete, admin/owner only)
   Archive/Restore are reversible, so they use a simple confirm dialog. Delete is a
   permanent cascade, so it uses a typed-confirm dialog (the user must type the exact
   property name) and is only offered to admin/owner (canDelete). The server re-checks
   the role and the typed name regardless, so hiding the item is convenience, not security. */
function RowActionsMenu({
  property,
  isArchived,
  canDelete,
  navigate,
  refresh,
}: {
  property: PropertyListItem;
  isArchived: boolean;
  canDelete: boolean;
  navigate: (path: string) => void;
  refresh?: () => void;
}) {
  // Which dialog (if any) is currently open. The dropdown itself closes on select, so the
  // dialogs live here at the row level rather than inside the menu, where they'd unmount.
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // True while an action's server call is in flight (disables buttons, shows "Working…").
  const [pending, setPending] = useState(false);
  // What the user has typed into the delete confirmation box.
  const [typed, setTyped] = useState("");
  // Cascade counts for the delete dialog, fetched lazily when it opens. null = still loading.
  const [counts, setCounts] = useState<{
    leases: number;
    payments: number;
    documents: number;
    otherTotal: number;
  } | null>(null);

  // Archive or restore, depending on the row's current state. Both are reversible.
  async function handleArchiveToggle() {
    setPending(true);
    try {
      const result = isArchived
        ? await restorePropertyAction(property.id)
        : await archivePropertyAction(property.id);
      if (result.ok) {
        toast.success(isArchived ? "Property restored" : "Property archived");
        setArchiveOpen(false);
        refresh?.();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    } finally {
      setPending(false);
    }
  }

  // Open the delete dialog and fetch the cascade counts so the warning is accurate.
  async function openDeleteDialog() {
    setTyped("");
    setCounts(null);
    setDeleteOpen(true);
    const result = await getPropertyCascadeCountsAction(property.id);
    if (result.ok && result.counts) setCounts(result.counts);
  }

  // Run the hard delete. The button is only enabled once the typed name matches exactly.
  async function handleDelete() {
    if (typed.trim() !== property.name.trim() || pending) return;
    setPending(true);
    try {
      const result = await deletePropertyAction(property.id, typed);
      if (result.ok) {
        toast.success("Property deleted");
        setDeleteOpen(false);
        refresh?.();
      } else {
        toast.error(result.error ?? "Could not delete property");
      }
    } finally {
      setPending(false);
    }
  }

  // Build a human-readable blast-radius summary for the confirm dialog.
  // Empty property → single sentence. Property with children → list what will be destroyed.
  function blastRadiusLine(): string {
    if (!counts) return "";
    const parts: string[] = [];
    if (counts.leases > 0) parts.push(`${counts.leases} lease${counts.leases === 1 ? "" : "s"}`);
    if (counts.payments > 0) parts.push(`${counts.payments} payment${counts.payments === 1 ? "" : "s"}`);
    if (counts.documents > 0) parts.push(`${counts.documents} document${counts.documents === 1 ? "" : "s"}`);
    if (counts.otherTotal > 0) parts.push(`${counts.otherTotal} other record${counts.otherTotal === 1 ? "" : "s"}`);
    if (parts.length === 0) return "This permanently deletes the property. This cannot be undone.";
    return `This permanently deletes the property along with ${parts.join(", ")}. This cannot be undone.`;
  }

  const typedMatches = typed.trim() === property.name.trim();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${property.name}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => navigate(`/property/${property.id}`)}>
            <Eye className="w-4 h-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(`/property/${property.id}/edit`)}>
            <Pencil className="w-4 h-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
            {isArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4" />
                Restore
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Archive
              </>
            )}
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  void openDeleteDialog();
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Archive / Restore — reversible, so a simple confirm. */}
      <AlertDialog open={archiveOpen} onOpenChange={(o) => { if (!pending) setArchiveOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? `Restore ${property.name}?` : `Archive ${property.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? "This property will move back into your active portfolio."
                : "This property will be hidden from your active portfolio. You can restore it any time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => { e.preventDefault(); void handleArchiveToggle(); }}
            >
              {pending ? "Working…" : isArchived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete — permanent + cascading, so a typed confirm. */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!pending) { setDeleteOpen(o); if (!o) setTyped(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {property.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {counts == null
                ? "Checking what would be affected…"
                : blastRadiusLine()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Show the typed-confirm input as soon as counts have loaded. */}
          {counts != null && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`delete-confirm-${property.id}`}>
                Type <span className="font-semibold">{property.name}</span> to confirm
              </Label>
              <Input
                id={`delete-confirm-${property.id}`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                disabled={pending}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            {counts != null && (
              <AlertDialogAction
                disabled={!typedMatches || pending}
                onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              >
                {pending ? "Working…" : "Delete property"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
