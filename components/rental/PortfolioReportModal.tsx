"use client";

import { TrendingUp, Home, DollarSign, Activity } from "lucide-react";
import { cn } from "@/components/ui/utils";
import {
  PhoneSheet,
  PhoneSheetBody,
  PhoneSheetContent,
  PhoneSheetDescription,
  PhoneSheetFooter,
  PhoneSheetHeader,
  PhoneSheetTitle,
} from "@/components/ui/phone-sheet";
import type { RentalDashboardData } from "@/app/(shell)/rental/queries";

/**
 * PortfolioReportModal
 *
 * Surfaces a high-density portfolio report (KPI strip + lease ranking
 * table) from the Rental Dashboard. On phone it's a full-screen bottom
 * sheet; on tablet+ it's a centered dialog at ~640px wide. The lease
 * ranking table is horizontally scrollable on phone to keep all four
 * columns readable without word-wrap.
 */
interface PortfolioReportModalProps {
  open: boolean;
  onClose: () => void;
  data: Pick<
    RentalDashboardData,
    | "grossIncome"
    | "incomeTrend"
    | "occupancyPct"
    | "collectionRate"
    | "recoveryRate"
    | "evictionRisk"
    | "vacancyCost"
    | "leaseTableRows"
    | "properties"
  >;
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</p>
      <p className="text-[22px] font-extrabold leading-none tabular-nums text-val-heading">{value}</p>
      {sub && <p className="text-[12px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function PortfolioReportModal({
  open,
  onClose,
  data,
}: PortfolioReportModalProps) {
  const reportDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalProperties = data.properties.length;
  const activeLeases = data.leaseTableRows.length;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onClose();
  }

  return (
    <PhoneSheet open={open} onOpenChange={handleOpenChange}>
      <PhoneSheetContent
        desktopMaxWidth="sm:max-w-[640px]"
        className="sm:rounded-xl"
      >
        <PhoneSheetHeader className="flex-col items-start gap-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">
              Valgate
            </span>
            <span className="text-[11px] text-slate-300">/</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              Portfolio Report
            </span>
          </div>
          <PhoneSheetTitle className="text-[20px] font-extrabold text-val-heading">
            Rental Portfolio Summary
          </PhoneSheetTitle>
          <PhoneSheetDescription className="text-[13px] text-slate-400">
            As of {reportDate}
          </PhoneSheetDescription>
        </PhoneSheetHeader>

        <PhoneSheetBody className="flex flex-col gap-6">
          {/* KPI grid — 2 cols on phone (~175px each at 390px viewport),
              4 cols on tablet+. Keeps numbers readable without shrinking. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Gross Income"
              value={data.grossIncome}
              sub={`${data.incomeTrend} vs last month`}
              icon={DollarSign}
              accent="bg-blue-100 text-blue-600"
            />
            <MetricCard
              label="Occupancy"
              value={`${data.occupancyPct}%`}
              sub={`${totalProperties} propert${totalProperties === 1 ? "y" : "ies"}`}
              icon={Home}
              accent="bg-emerald-100 text-emerald-600"
            />
            <MetricCard
              label="Collection"
              value={data.collectionRate}
              sub="Rent collected"
              icon={Activity}
              accent="bg-violet-100 text-violet-600"
            />
            <MetricCard
              label="Recovery"
              value={data.recoveryRate}
              sub={`Eviction risk: ${data.evictionRisk}`}
              icon={TrendingUp}
              accent="bg-amber-100 text-amber-600"
            />
          </div>

          {/* Portfolio overview table */}
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-val-heading">
                Property Ranking — By Yield
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {activeLeases} active lease{activeLeases !== 1 ? "s" : ""}
              </span>
            </div>
            {data.leaseTableRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-slate-400">
                No active leases to display.
              </p>
            ) : (
              // Wrap in overflow-x-auto so the four-column table stays
              // horizontally scrollable on iPhone 14 (390px) without
              // squishing columns or wrapping currency figures.
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      <th className="px-4 py-2.5 text-left">Property</th>
                      <th className="px-4 py-2.5 text-right">Monthly Rent</th>
                      <th className="px-4 py-2.5 text-right">NOI (Annual)</th>
                      <th className="px-4 py-2.5 text-right">Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaseTableRows.map((row, i) => (
                      <tr
                        key={row.propertyId}
                        className={cn(
                          "border-t border-slate-100",
                          i % 2 === 1 && "bg-slate-50/50",
                        )}
                      >
                        <td className="px-4 py-3 font-semibold text-val-heading">
                          <div className="font-semibold text-val-heading">
                            {row.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {row.location}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">
                          {row.rent}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">
                          {row.noi}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]",
                              row.indexColor,
                            )}
                          >
                            {row.index}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Vacancy cost note */}
          {data.vacancyCost !== "$0" && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-[13px] font-semibold text-amber-700">
                Estimated vacancy cost:{" "}
                <span className="font-extrabold">{data.vacancyCost}</span>
                <span className="font-normal text-amber-600">
                  {" "}/ month from unoccupied units
                </span>
              </p>
            </div>
          )}

          <p className="pb-1 text-center text-[11px] text-slate-400">
            This report reflects real-time data from your Valgate portfolio.
            Generated {reportDate}.
          </p>
        </PhoneSheetBody>

        <PhoneSheetFooter className="sm:flex-row sm:items-center sm:justify-between">
          {/* Hide the "Export-ready" caption on phone — the sheet is
              already focused on the report, the label is redundant. */}
          <p className="hidden text-[12px] text-slate-400 sm:block">
            Export-ready summary
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="min-h-11 flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:flex-initial"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="min-h-11 flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all active:scale-[0.97] sm:flex-initial"
              style={{
                background:
                  "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25)",
              }}
            >
              Print / Export
            </button>
          </div>
        </PhoneSheetFooter>
      </PhoneSheetContent>
    </PhoneSheet>
  );
}
