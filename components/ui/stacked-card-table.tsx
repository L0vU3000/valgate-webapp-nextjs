"use client";

import { type ReactNode } from "react";

import { cn } from "./utils";

/**
 * StackedCardTable
 *
 * A data-table primitive that renders as a native `<table>` on tablet+ and
 * collapses to a list of stacked cards on phone (`< sm`). Each phone card
 * uses semantic `<dl>/<dt>/<dd>` so screen readers announce label-value
 * pairs correctly.
 *
 *   Tablet+ → traditional table with header row + body rows
 *   Phone   → one card per row; primary column becomes card title;
 *             secondary columns become a 2-column label-value grid below.
 *
 * **When to use StackedCardTable vs `<TableScroll>`:**
 *   StackedCardTable suits "humans as rows" tables — leases, leaseholders,
 *   owners, professionals. The row identity is a person/entity; comparing
 *   one row to another isn't the main task.
 *
 *   `<TableScroll>` (with sticky first column) suits "data logs" — payment
 *   ledgers, inspection histories, audit trails. Comparing values across
 *   rows IS the task and a tabular layout preserves that.
 *
 * Mobbin references: F1 Performance, Trello My Cards, CVS Discount Cards.
 */

export interface StackedCardColumn<Row> {
  /** Unique key for React + a11y `id` linkage. */
  key: string;
  /** Header label (string only — kept simple for a11y). */
  label: string;
  /** How to render the cell value for this column. */
  render: (row: Row) => ReactNode;
  /** Optional alignment for the desktop table cell. Defaults to "left". */
  align?: "left" | "right" | "center";
  /** Whether to render this column inside the phone card (default true). */
  showOnPhone?: boolean;
  /** Whether to render this column on tablet+. Default true. */
  showOnDesktop?: boolean;
}

export interface StackedCardTableProps<Row> {
  columns: StackedCardColumn<Row>[];
  rows: Row[];
  /**
   * Key of the column that titles each phone card (usually the entity name —
   * e.g. tenant name, owner name).
   */
  primaryColumn: string;
  /**
   * Optional key of a column to render in the top-right of the phone card
   * header (e.g. status pill, balance). Pulled OUT of the dl/dt/dd list.
   */
  trailingColumn?: string;
  /**
   * Stable key for each row (defaults to index — pass a real id when possible).
   */
  rowKey?: (row: Row, index: number) => string;
  /** Optional click handler for whole-row taps on phone (and on rows on desktop). */
  onRowClick?: (row: Row) => void;
  /** Empty-state element to show when `rows.length === 0`. */
  emptyState?: ReactNode;
  /** Optional className applied to the outer wrapper. */
  className?: string;
  /** Optional className for each phone card. */
  cardClassName?: string;
}

export function StackedCardTable<Row>({
  columns,
  rows,
  primaryColumn,
  trailingColumn,
  rowKey,
  onRowClick,
  emptyState,
  className,
  cardClassName,
}: StackedCardTableProps<Row>) {
  if (rows.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  const phoneCols = columns.filter((c) => c.showOnPhone !== false);
  const desktopCols = columns.filter((c) => c.showOnDesktop !== false);

  const primaryCol = columns.find((c) => c.key === primaryColumn);
  const trailingCol = trailingColumn
    ? columns.find((c) => c.key === trailingColumn)
    : undefined;
  const secondaryCols = phoneCols.filter(
    (c) => c.key !== primaryColumn && c.key !== trailingColumn,
  );

  const getKey = (row: Row, index: number) =>
    rowKey ? rowKey(row, index) : String(index);

  return (
    <div className={className}>
      {/* Phone: stacked cards */}
      <div className="sm:hidden flex flex-col gap-3">
        {rows.map((row, index) => {
          const key = getKey(row, index);
          const Wrapper = onRowClick ? "button" : "article";
          return (
            <Wrapper
              key={key}
              type={onRowClick ? ("button" as const) : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "min-h-16 rounded-xl border border-border-subtle bg-surface-base p-4 flex flex-col gap-3 text-left",
                onRowClick &&
                  "transition-colors hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 active:scale-[0.99]",
                cardClassName,
              )}
            >
              {/* Card header: primary value + optional trailing */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-base font-semibold text-foreground">
                  {primaryCol ? primaryCol.render(row) : null}
                </div>
                {trailingCol && (
                  <div className="shrink-0 text-sm font-medium text-foreground">
                    {trailingCol.render(row)}
                  </div>
                )}
              </div>

              {/* Secondary columns as a label-value grid */}
              {secondaryCols.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {secondaryCols.map((col) => (
                    <div key={col.key} className="flex flex-col gap-0.5 min-w-0">
                      <dt className="text-[11px] uppercase tracking-wider text-tertiary">
                        {col.label}
                      </dt>
                      <dd className="text-sm font-medium text-foreground truncate">
                        {col.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Wrapper>
          );
        })}
      </div>

      {/* Tablet+: native table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              {desktopCols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    !col.align && "text-left",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const key = getKey(row, index);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border-subtle last:border-b-0",
                    onRowClick && "cursor-pointer hover:bg-surface-tint transition-colors",
                  )}
                >
                  {desktopCols.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-foreground",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
