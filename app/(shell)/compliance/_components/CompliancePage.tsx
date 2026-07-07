"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  FileCheck,
  ClipboardCheck,
  AlertTriangle,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableScroll } from "@/components/ui/table-scroll";
import { MobileCardTable } from "@/components/property/MobileCardTable";
import { updateSafetyRisk } from "@/app/actions/safety-risks";
import type {
  ComplianceSummary,
  ComplianceRow,
  ComplianceState,
  ComplianceMonitorCard,
} from "@/lib/data/derivations/compliance";

interface Props {
  data: ComplianceSummary;
  // Hides inline write controls in the "view as client" preview (Phase 2).
  readOnly?: boolean;
}

function stateTone(state: ComplianceState) {
  if (state === "overdue") return { dot: "bg-rose-500", text: "text-rose-800", bg: "bg-rose-50", ring: "ring-rose-100" };
  if (state === "attention") return { dot: "bg-amber-500", text: "text-amber-900", bg: "bg-amber-50", ring: "ring-amber-100" };
  return { dot: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50", ring: "ring-emerald-100" };
}

const CARD_ICON = {
  certifications: FileCheck,
  inspections: ClipboardCheck,
  "safety-risks": AlertTriangle,
} as const;

export function CompliancePage({ data, readOnly = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function resolveRisk(riskId: string) {
    startTransition(async () => {
      const result = await updateSafetyRisk(riskId, { status: "Resolved" });
      if (result.ok) router.refresh();
    });
  }

  const ring =
    data.overdueCount > 0 ? "text-rose-500" : data.attentionCount > 0 ? "text-amber-500" : "text-emerald-500";

  return (
    <main className="h-full flex flex-col bg-val-bg-page-alt">
      <div className="flex-1 overflow-auto scrollbar-none px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5 pt-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Valgate <span className="mx-1 text-slate-300">/</span> Compliance
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-extrabold leading-tight tracking-tight text-val-heading">
              Compliance
            </h1>
            <p className="max-w-xl text-[14px] leading-relaxed text-slate-600">
              {data.headline}
            </p>
          </div>

          {/* Progress + monitoring cards */}
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            {/* Vanta-style progress card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 flex items-center gap-5">
              <ProgressRing pct={data.compliantPct} className={ring} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  In good standing
                </p>
                <p className="mt-1 text-[13px] leading-snug text-slate-600">
                  {data.okCount} of {data.trackedCount} obligation
                  {data.trackedCount === 1 ? "" : "s"} up to date
                </p>
                {(data.overdueCount > 0 || data.attentionCount > 0) && (
                  <p className="mt-1.5 text-[12px] font-medium text-slate-500">
                    {data.overdueCount > 0 && (
                      <span className="text-rose-700">{data.overdueCount} overdue</span>
                    )}
                    {data.overdueCount > 0 && data.attentionCount > 0 && " · "}
                    {data.attentionCount > 0 && (
                      <span className="text-amber-700">{data.attentionCount} to review</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Monitoring cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {data.cards.map((card) => (
                <MonitorCard key={card.key} card={card} />
              ))}
            </div>
          </div>

          {/* Register */}
          <section className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-val-heading">
                Compliance register
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Every certificate, inspection and safety risk across your portfolio
              </p>
            </div>

            {data.rows.length === 0 ? (
              <div className="px-6 py-10">
                <EmptyState
                  icon={<ShieldCheck className="size-6" />}
                  title="Nothing to track yet"
                  description="Certificates, inspections and safety risks will appear here as you add them from each property's Safety tab."
                />
              </div>
            ) : (
              <MobileCardTable
                desktop={
                  <TableScroll stickyFirstColumn>
                    <table className="w-full min-w-[720px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <Th className="data-sticky-col bg-white">Item</Th>
                          <Th>Property</Th>
                          <Th>Type</Th>
                          <Th>Due</Th>
                          <Th>Status</Th>
                          <Th className="text-right">Action</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((row) => (
                          <tr
                            key={`${row.kind}-${row.id}`}
                            className="border-t border-slate-50 transition-colors duration-150 hover:bg-slate-50/50"
                          >
                            <Td className="data-sticky-col bg-white font-medium text-val-heading">
                              {row.title}
                            </Td>
                            <Td className="text-slate-600">{row.propertyName}</Td>
                            <Td className="text-slate-500">{row.kind}</Td>
                            <Td>
                              <span
                                className={cn(
                                  "tabular-nums",
                                  row.overdueDays > 0 ? "font-semibold text-rose-700" : "text-slate-600",
                                )}
                              >
                                {row.dateLabel}
                              </span>
                            </Td>
                            <Td>
                              <StatusBadge row={row} />
                            </Td>
                            <Td className="text-right">
                              <RowAction
                                row={row}
                                readOnly={readOnly}
                                pending={isPending}
                                onResolve={resolveRisk}
                              />
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableScroll>
                }
                mobile={
                  <div className="flex flex-col divide-y divide-slate-100">
                    {data.rows.map((row) => (
                      <div key={`${row.kind}-${row.id}`} className="px-5 py-4 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-val-heading truncate">
                              {row.title}
                            </p>
                            <p className="text-[12px] text-slate-500 mt-0.5">
                              {row.propertyName} · {row.kind}
                            </p>
                          </div>
                          <StatusBadge row={row} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-[12px] tabular-nums",
                              row.overdueDays > 0 ? "font-semibold text-rose-700" : "text-slate-500",
                            )}
                          >
                            {row.dateLabel}
                          </span>
                          <RowAction
                            row={row}
                            readOnly={readOnly}
                            pending={isPending}
                            onResolve={resolveRisk}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ row }: { row: ComplianceRow }) {
  const tone = stateTone(row.state);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset shrink-0",
        tone.bg,
        tone.text,
        tone.ring,
      )}
    >
      {row.state === "ok" && <Check className="size-3" aria-hidden />}
      {row.statusLabel}
    </span>
  );
}

// Safety risks resolve inline; certificates / inspections deep-link to the
// property Safety tab for full create/edit (per design Q3 — no duplicate forms).
function RowAction({
  row,
  readOnly,
  pending,
  onResolve,
}: {
  row: ComplianceRow;
  readOnly: boolean;
  pending: boolean;
  onResolve: (riskId: string) => void;
}) {
  if (!readOnly && row.resolvableRiskId) {
    return (
      <button
        type="button"
        onClick={() => onResolve(row.resolvableRiskId!)}
        disabled={pending}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-val-heading transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      >
        <Check className="size-3.5 text-emerald-600" aria-hidden />
        Resolve
      </button>
    );
  }
  return (
    <Link
      href={`/property/${row.propertyId}/safety`}
      className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[var(--val-primary-dark)] transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:underline"
    >
      View
      <ChevronRight className="size-3.5" aria-hidden />
    </Link>
  );
}

function MonitorCard({ card }: { card: ComplianceMonitorCard }) {
  const tone = stateTone(card.state);
  const Icon = CARD_ICON[card.key];
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          {card.label}
        </span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md ring-1 ring-inset",
            tone.bg,
            tone.text,
            tone.ring,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>
      <span className="text-[18px] font-bold leading-none text-val-heading">{card.value}</span>
      <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
        {card.detail}
      </span>
    </div>
  );
}

function ProgressRing({ pct, className }: { pct: number; className?: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="size-[76px] -rotate-90">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={className}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[18px] font-bold tabular-nums text-val-heading">
        {pct}%
      </span>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3.5 text-[13px] text-slate-600", className)}>{children}</td>;
}
