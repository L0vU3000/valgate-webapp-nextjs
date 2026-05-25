"use client";

import { toast } from "sonner";

import {
  TYPE_ICON,
  TYPE_COLOR,
  TYPE_LABEL,
  statusBadgeClasses,
  titleBadgeClasses,
  progressDotColor,
} from "@/lib/property-helpers";
import type { PropertyListItem } from "@/lib/data/types/property";
import { restorePropertyAction } from "@/app/(shell)/property/actions";

import type { TableAnimationConfig } from "./PropertyTable";

/**
 * PropertyMobileCard
 *
 * Mobile-only stacked card representation of a single PropertyTable row.
 * Each card is its own self-contained section to satisfy the "vertical, one
 * thing per section" mobile design goal. Replaces the desktop 9-column
 * table on small viewports.
 *
 * Visual layout (top → bottom):
 *   1. Type icon · Name + (type · province) · Status badge
 *   2. Size · Buy · Title — three labelled stats on a single row
 *   3. Progress bar with percentage (or Restore button when archived)
 *
 * Tapping the card navigates to the property detail page, mirroring the
 * desktop row click behavior. Tapping the progress row opens the progress
 * detail modal (managed by the parent `PropertyTable`).
 */
interface PropertyMobileCardProps {
  property: PropertyListItem;
  /** Index of this card within the current page, used for staggered entrance. */
  rowIndex: number;
  /** Whether the parent has finished mounting (drives entrance animations). */
  mounted: boolean;
  /** Shared animation config from PropertyTable. */
  cfg: TableAnimationConfig;
  /** True when rendering the archived list — swaps progress for a restore button. */
  showArchived: boolean;
  /** Navigation handler (typically `router.push`). */
  navigate: (path: string) => void;
  /** Called when the user taps the progress bar; parent opens the progress modal. */
  onClickProgress: (p: PropertyListItem) => void;
}

export function PropertyMobileCard({
  property,
  rowIndex,
  mounted,
  cfg,
  showArchived,
  navigate,
  onClickProgress,
}: PropertyMobileCardProps) {
  const TypeIcon = TYPE_ICON[property.type];
  const typeColor = TYPE_COLOR[property.type];
  const progressBarColor = progressDotColor(property.progress);

  // Match desktop's progress text color thresholds.
  const progressTextColor =
    property.progress >= 80
      ? "text-emerald-600"
      : property.progress >= 50
        ? "text-amber-500"
        : "text-red-400";

  // Archived properties are rendered with reduced opacity and swap their
  // tappable row + progress section for a "Restore" affordance.
  const rowIsArchived = showArchived || !!property.isArchived;

  // Tap target: the whole card is clickable on non-archived rows. Keyboard
  // support mirrors the desktop table (Enter / Space activates the link).
  const handleCardClick = () => {
    if (!rowIsArchived) {
      navigate(`/property/${property.id}`);
    }
  };

  const handleCardKeyDown = (event: React.KeyboardEvent) => {
    if (rowIsArchived) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(`/property/${property.id}`);
    }
  };

  // Restoring an archived property — server action + toast feedback.
  const handleRestore = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = await restorePropertyAction(property.id);
    if (result.ok) {
      toast.success("Property restored");
    }
  };

  // Progress button: opens the progress detail modal via the parent handler.
  // We only open the modal when `progressDetails` exists — older seeds may
  // not have it populated.
  const handleProgressClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (property.progressDetails) {
      onClickProgress(property);
    }
  };

  return (
    <div
      role={rowIsArchived ? undefined : "link"}
      tabIndex={rowIsArchived ? undefined : 0}
      aria-label={rowIsArchived ? property.name : `View ${property.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`flex flex-col gap-3 bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        rowIsArchived
          ? "opacity-60"
          : "cursor-pointer hover:border-slate-300 active:bg-blue-50/40 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
      }`}
      style={{
        opacity: mounted ? (rowIsArchived ? 0.6 : 1) : 0,
        transform: mounted ? "translateY(0)" : "translateY(-6px)",
        transition: `opacity ${cfg.rowDuration}ms cubic-bezier(0.25,1,0.5,1), transform ${cfg.rowDuration}ms cubic-bezier(0.25,1,0.5,1)`,
        transitionDelay: `${cfg.containerDelay + rowIndex * cfg.rowStagger}ms`,
      }}
    >
      {/* Row 1 — Type icon · Name + sublabel · Status badge */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeColor}`}
        >
          <TypeIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[15px] text-val-heading font-semibold leading-tight truncate"
            title={property.name}
          >
            {property.name}
          </p>
          <p className="text-[12px] text-slate-500 mt-0.5 truncate">
            {TYPE_LABEL[property.type]} · {property.province ?? "—"}
          </p>
        </div>
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${statusBadgeClasses(property.status)}`}
        >
          {property.status}
        </span>
      </div>

      {/* Row 2 — Size · Buy · (optional) Title */}
      <div className="flex items-end gap-5 pt-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
            Size
          </span>
          <span className="text-[13px] text-slate-700 font-medium tabular-nums">
            {property.totalArea
              ? `${Number(property.totalArea).toLocaleString()} m²`
              : "—"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
            Buy
          </span>
          <span className="text-[13px] text-slate-900 font-semibold tabular-nums">
            {property.buy}
          </span>
        </div>
        {property.title !== "—" && (
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
              Title
            </span>
            <span
              className={`inline-flex self-start px-1.5 py-0.5 rounded-full text-[11px] font-medium mt-0.5 ${titleBadgeClasses(property.title)}`}
            >
              {property.title}
            </span>
          </div>
        )}
      </div>

      {/* Row 3 — Progress bar (or Restore action on archived rows) */}
      {rowIsArchived ? (
        <button
          onClick={handleRestore}
          className="self-start px-4 py-2 text-[13px] font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-150"
        >
          Restore
        </button>
      ) : (
        <button
          aria-label={`Progress ${property.progress}% — tap for details`}
          onClick={handleProgressClick}
          className="flex items-center gap-3 w-full text-left rounded-md -mx-1 px-1 py-1 hover:bg-slate-50 transition-colors duration-150"
        >
          <span
            className={`text-[13px] font-bold tabular-nums leading-none w-11 shrink-0 ${progressTextColor}`}
          >
            {property.progress}%
          </span>
          <div className="flex-1 h-[5px] bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${progressBarColor}`}
              style={{
                width: mounted ? `${property.progress}%` : "0%",
                transitionDelay: `${cfg.containerDelay + cfg.progressBarDelay + rowIndex * cfg.progressBarStagger}ms`,
              }}
            />
          </div>
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold shrink-0">
            Progress
          </span>
        </button>
      )}
    </div>
  );
}
