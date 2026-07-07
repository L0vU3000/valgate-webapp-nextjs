"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Plus,
  CircleDot,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";
import {
  createMaintenanceItem,
  updateMaintenanceItem,
} from "@/app/actions/maintenance-items";
import type {
  MaintenanceSeverity,
  MaintenanceStatus,
} from "@/lib/data/types/maintenance-item";
import type {
  WorkOrderBoard,
  WorkOrderRow,
  WorkOrderTileKey,
} from "@/lib/data/derivations/work-orders";
import type { WorkOrderPropertyOption } from "../queries";

interface Props {
  data: WorkOrderBoard;
  properties: WorkOrderPropertyOption[];
  // Hides write controls when the manager escapes into the "view as client"
  // preview (Phase 2). Owners see the full page.
  readOnly?: boolean;
}

const TILE_STYLES: Record<WorkOrderTileKey, { icon: typeof CircleDot; tone: string; ring: string }> = {
  open: { icon: CircleDot, tone: "text-sky-700 bg-sky-50", ring: "ring-sky-100" },
  inProgress: { icon: Loader2, tone: "text-amber-800 bg-amber-50", ring: "ring-amber-100" },
  overdue: { icon: AlertTriangle, tone: "text-rose-800 bg-rose-50", ring: "ring-rose-100" },
  resolved: { icon: CheckCircle2, tone: "text-emerald-800 bg-emerald-50", ring: "ring-emerald-100" },
};

function severityStyles(severity: MaintenanceSeverity): string {
  if (severity === "Emergency") return "text-rose-800 bg-rose-50 ring-rose-100";
  if (severity === "Urgent") return "text-amber-900 bg-amber-50 ring-amber-100";
  return "text-slate-700 bg-slate-100 ring-slate-200";
}

function statusLabel(status: MaintenanceStatus): string {
  if (status === "InProgress") return "In progress";
  return status;
}

function statusStyles(status: MaintenanceStatus): string {
  if (status === "Open") return "text-sky-700 bg-sky-50 ring-sky-100";
  if (status === "InProgress") return "text-amber-800 bg-amber-50 ring-amber-100";
  if (status === "Resolved") return "text-emerald-700 bg-emerald-50 ring-emerald-100";
  return "text-slate-500 bg-slate-100 ring-slate-200";
}

export function WorkOrdersPage({ data, properties, readOnly = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function advance(row: WorkOrderRow, next: MaintenanceStatus) {
    startTransition(async () => {
      const result = await updateMaintenanceItem(row.id, { status: next });
      if (result.ok) router.refresh();
    });
  }

  return (
    <main className="h-full flex flex-col bg-val-bg-page-alt">
      <div className="flex-1 overflow-auto scrollbar-none px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5 pt-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Valgate <span className="mx-1 text-slate-300">/</span> Work Orders
              </p>
              <h1 className="text-[28px] sm:text-[34px] font-extrabold leading-tight tracking-tight text-val-heading">
                Work Orders
              </h1>
              <p className="max-w-xl text-[14px] leading-relaxed text-slate-600">
                {data.activeCount > 0
                  ? `${data.activeCount} active job${data.activeCount === 1 ? "" : "s"}${data.overdueCount > 0 ? ` · ${data.overdueCount} overdue` : ""} across your portfolio`
                  : "Every maintenance job is resolved"}
              </p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--val-primary-dark)] px-4 text-[14px] font-semibold text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--val-primary-dark)]/40 focus-visible:ring-offset-2"
              >
                <Plus className="size-4" aria-hidden />
                Add work order
              </button>
            )}
          </div>

          {/* Create form */}
          {!readOnly && showForm && (
            <NewWorkOrderForm
              properties={properties}
              pending={isPending}
              onClose={() => setShowForm(false)}
              onCreate={(input) =>
                startTransition(async () => {
                  const result = await createMaintenanceItem(input);
                  if (result.ok) {
                    setShowForm(false);
                    router.refresh();
                  }
                })
              }
            />
          )}

          {/* Status tiles */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {data.tiles.map((tile) => {
              const style = TILE_STYLES[tile.key];
              const Icon = style.icon;
              return (
                <div
                  key={tile.key}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                      {tile.label}
                    </span>
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md ring-1 ring-inset",
                        style.tone,
                        style.ring,
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                  </div>
                  <span className="text-[26px] font-bold tabular-nums leading-none text-val-heading">
                    {tile.count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grouped list */}
          {data.groups.length === 0 ? (
            <div className="rounded-xl border border-slate-200/90 bg-white px-6 py-10">
              <EmptyState
                icon={<Wrench className="size-6" />}
                title="No work orders yet"
                description={
                  readOnly
                    ? "Maintenance jobs will appear here once they are logged."
                    : "Log a maintenance job to start tracking work across your portfolio."
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {data.groups.map((group) => (
                <section
                  key={group.propertyId}
                  className="rounded-xl border border-slate-200/90 bg-white overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <h2 className="text-[14px] font-semibold tracking-tight text-val-heading">
                      {group.propertyName}
                    </h2>
                    <span className="text-[12px] font-medium text-slate-500">
                      {group.activeCount > 0
                        ? `${group.activeCount} active`
                        : "All clear"}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {group.rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                              severityStyles(row.severity),
                            )}
                          >
                            {row.severity}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-val-heading truncate">
                              {row.title}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500">
                              <span>
                                {row.status === "Resolved"
                                  ? "Resolved"
                                  : `Open ${row.ageDays}d`}
                              </span>
                              {row.vendorName && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span>{row.vendorName}</span>
                                </>
                              )}
                              {row.cost != null && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="tabular-nums">{formatCurrency(row.cost)}</span>
                                </>
                              )}
                              {row.isOverdue && (
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                                  <span className="text-slate-300">·</span>
                                  <AlertTriangle className="size-3" aria-hidden />
                                  Overdue by {row.overdueDays}d
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                              statusStyles(row.status),
                            )}
                          >
                            {statusLabel(row.status)}
                          </span>
                          {!readOnly && row.status === "Open" && (
                            <RowAction
                              label="Start"
                              disabled={isPending}
                              onClick={() => advance(row, "InProgress")}
                            />
                          )}
                          {!readOnly && row.status === "InProgress" && (
                            <RowAction
                              label="Resolve"
                              disabled={isPending}
                              onClick={() => advance(row, "Resolved")}
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function RowAction({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-val-heading transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
    >
      {label}
      <ChevronRight className="size-3.5 text-slate-400" aria-hidden />
    </button>
  );
}

const SEVERITIES: MaintenanceSeverity[] = ["Emergency", "Urgent", "Standard"];

function NewWorkOrderForm({
  properties,
  pending,
  onCreate,
  onClose,
}: {
  properties: WorkOrderPropertyOption[];
  pending: boolean;
  onCreate: (input: {
    propertyId: string;
    title: string;
    severity: MaintenanceSeverity;
    status: MaintenanceStatus;
  }) => void;
  onClose: () => void;
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<MaintenanceSeverity>("Standard");

  const canSubmit = propertyId !== "" && title.trim() !== "" && !pending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onCreate({ propertyId, title: title.trim(), severity, status: "Open" });
      }}
      className="rounded-xl border border-slate-200/90 bg-white p-5 flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Property
          </span>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-val-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--val-primary-dark)]/30"
          >
            {properties.length === 0 && <option value="">No properties</option>}
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Severity
          </span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as MaintenanceSeverity)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-val-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--val-primary-dark)]/30"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          What needs doing?
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Replace kitchen tap washer"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-val-heading placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--val-primary-dark)]/30"
        />
      </label>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-9 items-center rounded-lg bg-[var(--val-primary-dark)] px-4 text-[13px] font-semibold text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create work order"}
        </button>
      </div>
    </form>
  );
}
