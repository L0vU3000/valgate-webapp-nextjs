"use client";

import { X, TrendingUp, Home, DollarSign, Activity } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { RentalDashboardData } from "@/app/(shell)/rental/queries";

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
      <p className="text-[22px] font-extrabold text-val-heading leading-none tabular-nums">{value}</p>
      {sub && <p className="text-[12px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function PortfolioReportModal({ open, onClose, data }: PortfolioReportModalProps) {
  if (!open) return null;

  const reportDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalProperties = data.properties.length;
  const activeLeases = data.leaseTableRows.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[640px] max-h-[88vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">Valgate</span>
              <span className="text-[11px] text-slate-300">/</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Portfolio Report</span>
            </div>
            <h2 className="text-[20px] font-extrabold text-val-heading">Rental Portfolio Summary</h2>
            <p className="text-[13px] text-slate-400 mt-0.5">As of {reportDate}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

          {/* Portfolio overview */}
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-100">
              <h3 className="text-[13px] font-bold text-val-heading uppercase tracking-[0.04em]">Property Ranking — By Yield</h3>
              <span className="text-[11px] font-semibold text-slate-400">{activeLeases} active lease{activeLeases !== 1 ? "s" : ""}</span>
            </div>
            {data.leaseTableRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-slate-400">No active leases to display.</p>
            ) : (
              <table className="w-full text-[13px]">
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
                      className={cn("border-t border-slate-100", i % 2 === 1 && "bg-slate-50/50")}
                    >
                      <td className="px-4 py-3 font-semibold text-val-heading">
                        <div className="font-semibold text-val-heading">{row.name}</div>
                        <div className="text-[11px] text-slate-400">{row.location}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{row.rent}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">{row.noi}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]", row.indexColor)}>
                          {row.index}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Vacancy cost note */}
          {data.vacancyCost !== "$0" && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-[13px] font-semibold text-amber-700">
                Estimated vacancy cost: <span className="font-extrabold">{data.vacancyCost}</span>
                <span className="font-normal text-amber-600"> / month from unoccupied units</span>
              </p>
            </div>
          )}

          {/* Footer note */}
          <p className="text-[11px] text-slate-400 text-center pb-1">
            This report reflects real-time data from your Valgate portfolio. Generated {reportDate}.
          </p>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 px-6 py-4 shrink-0 flex items-center justify-between gap-3">
          <p className="text-[12px] text-slate-400">Export-ready summary</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25)",
              }}
            >
              Print / Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
