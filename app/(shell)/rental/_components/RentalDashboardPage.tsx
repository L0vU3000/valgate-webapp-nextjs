"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, FileText } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { cn } from "@/components/ui/utils";
import { KpiCards } from "@/components/rental/KpiCards";
import { HeatmapGrid } from "@/components/rental/HeatmapGrid";
import { LeaseTable } from "@/components/rental/LeaseTable";
import { AddLeaseModal } from "@/components/rental/AddLeaseModal";
import { PortfolioReportModal } from "@/components/rental/PortfolioReportModal";
import type { RentalDashboardData } from "../queries";

/* -------------------------------------------------------------------------- */
/*  Static UI Config                                                          */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export function RentalDashboardPage({ data }: { data: RentalDashboardData }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showAddLease, setShowAddLease] = useState(false);
  const [showPortfolioReport, setShowPortfolioReport] = useState(false);

  const {
    properties,
    pipelineStages,
    arrearsBuckets,
    maintenanceItems,
    maintenanceTotal,
    upcomingEvents,
    recoveryRate,
    evictionRisk,
    vacancyCost,
    topSpend,
    heatmapClusters,
    occupancyPct,
    grossIncome,
    incomeTrend,
    incomeHistory,
    collectionRate,
    leaseTableRows,
  } = data;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex h-full flex-col bg-val-bg-page-alt">
      <AppHeader />

      <div className="flex-1 overflow-auto scrollbar-none px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5 pt-6">

          {/* Page Header */}
          <div
            className="flex flex-col transition-all duration-500"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-8px)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">Valgate</span>
              <span className="text-[11px] text-slate-300">/</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Rental</span>
            </div>
            <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">Rental Dashboard</h1>
            <p className="text-[14px] sm:text-[15px] text-slate-500 mt-2">Track properties, leases, and income across your rental portfolio.</p>
          </div>

          {/* ================================================================ */}
          {/*  Zone 1: Hero Vitals                                             */}
          {/* ================================================================ */}
          <KpiCards
            grossIncome={grossIncome}
            incomeTrend={incomeTrend}
            incomeHistory={incomeHistory}
            occupancyPct={occupancyPct}
            vacancyCost={vacancyCost}
            collectionRate={collectionRate}
            maintenanceItems={maintenanceItems}
            maintenanceTotal={maintenanceTotal}
          />

          {/* ================================================================ */}
          {/*  Zone 2: Quick Actions                                           */}
          {/* ================================================================ */}
          <section
            className="anim-enter flex items-center gap-3 lg:gap-4 rounded-lg border border-slate-200 bg-white p-3 lg:p-4 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] overflow-x-auto scrollbar-none"
            style={{ animationDelay: "300ms" }}
          >
            <span className="shrink-0 border-r border-slate-200 pr-3 lg:pr-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              Actions
            </span>
            <button
              onClick={() => setShowAddLease(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
              style={{
                background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
              }}
            >
              <Plus className="h-4 w-4" />
              New Lease
            </button>
            <button
              onClick={() => router.push("/add-property")}
              className="shrink-0 flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150"
            >
              <Building2 className="h-4 w-4" />
              Add Property
            </button>
            <button
              onClick={() => setShowPortfolioReport(true)}
              className="shrink-0 flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150"
            >
              <FileText className="h-4 w-4" />
              Portfolio Report
            </button>
          </section>

          {/* Modals */}
          <AddLeaseModal
            open={showAddLease}
            onClose={() => setShowAddLease(false)}
            properties={properties}
          />
          <PortfolioReportModal
            open={showPortfolioReport}
            onClose={() => setShowPortfolioReport(false)}
            data={{
              grossIncome,
              incomeTrend,
              occupancyPct,
              collectionRate,
              recoveryRate,
              evictionRisk,
              vacancyCost,
              leaseTableRows,
              properties,
            }}
          />

          {/* ================================================================ */}
          {/*  Zone 3: Asymmetric — Table + Heatmap                           */}
          {/* ================================================================ */}
          {/*
            On mobile we collapse to a single-column stack so the lease table
            and occupancy heatmap each get the full viewport width. The
            children keep their `col-span-8` / `col-span-4` for the desktop
            12-col layout — those values are ignored when the parent grid
            only has 1 column.
          */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <LeaseTable data={leaseTableRows} />
            <HeatmapGrid data={heatmapClusters} />
          </section>

          {/* ================================================================ */}
          {/*  Zone 4: Lease Renewal Pipeline                                 */}
          {/* ================================================================ */}
          <section
            className="anim-enter overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
            style={{ animationDelay: "550ms" }}
          >
            <div className="border-b border-slate-100 px-5 sm:px-6 py-4 sm:py-5">
              <h2 className="text-[18px] sm:text-[24px] font-bold text-val-heading">Lease Renewal Pipeline</h2>
            </div>
            {/*
              Mobile: vertical stack of stages, separated by horizontal
              dividers. Each stage becomes its own readable section.
              Desktop (`lg:` and up): the original side-by-side kanban.
            */}
            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {pipelineStages.map((stage, si) => (
                <div key={stage.label} className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[11px] font-semibold uppercase tracking-[0.05em]", stage.color)}>
                      {stage.label}
                    </span>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", stage.countBg)}>
                      {stage.count}
                    </span>
                  </div>
                  {stage.cards.map((card, ci) => (
                    <div
                      key={card.unit}
                      className={cn(
                        "anim-enter rounded border border-slate-200 p-3 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]",
                        card.faded && "opacity-50"
                      )}
                      style={{ animationDelay: `${650 + si * 100 + ci * 60}ms` }}
                    >
                      <p className="text-[14px] sm:text-[15px] font-semibold text-val-heading">{card.unit}</p>
                      <p className="text-[12px] text-slate-400">{card.detail}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ================================================================ */}
          {/*  Zone 5: Bottom Triptych                                        */}
          {/* ================================================================ */}
          {/*
            On mobile each card is its own full-width section, stacked
            vertically (Rent Collection → Maintenance → Upcoming Events).
            On `lg:` the original asymmetric 5/3/4 layout returns.
          */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 pb-8">

            {/* Rent Collection & Arrears */}
            <div
              className="anim-enter lg:col-span-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
              style={{ animationDelay: "700ms" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading">Rent Collection &amp; Arrears</h3>
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Aging Buckets</span>
              </div>
              <div className="mt-6 flex flex-col gap-4">
                {arrearsBuckets.map((bucket, i) => (
                  <div key={bucket.label} className="flex items-center gap-4">
                    <span className="w-12 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{bucket.label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-slate-50 h-8">
                      <div
                        className={cn("rental-bar h-full", bucket.color)}
                        style={{ width: bucket.width, animationDelay: `${900 + i * 120}ms` }}
                      />
                    </div>
                    <span className="text-[14px] sm:text-[15px] font-semibold text-val-heading tabular-nums">{bucket.amount}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-start justify-around border-t border-slate-100 pt-5">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Billing Recovery</p>
                  <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none tabular-nums">{recoveryRate}</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Eviction Risk</p>
                  <p className={cn("text-[22px] sm:text-[26px] font-bold leading-none tabular-nums", evictionRisk === "None" ? "text-green-600" : "text-rose-700")}>
                    {evictionRisk}
                  </p>
                </div>
              </div>
            </div>

            {/* Maintenance Exposure */}
            <div
              className="anim-enter lg:col-span-3 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
              style={{ animationDelay: "780ms" }}
            >
              <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading">
                Maintenance<br />Exposure
              </h3>
              <div className="mt-6 flex flex-col gap-4">
                {maintenanceItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", item.color)} />
                      <span className="text-[14px] sm:text-[15px] font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-[14px] sm:text-[15px] font-semibold text-val-heading tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Top Spend Category</p>
              {topSpend ? (
                <div className="mt-2 rounded bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-val-heading">{topSpend.category}</span>
                    <span className="text-xs font-semibold text-blue-700">{topSpend.amount}</span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="rental-bar h-full rounded-full bg-blue-700"
                      style={{ width: topSpend.pct, animationDelay: "1000ms" }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400">No expense data</p>
              )}
            </div>

            {/* Upcoming Events */}
            <div
              className="anim-enter-right lg:col-span-4 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
              style={{ animationDelay: "750ms" }}
            >
              <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading">Upcoming Events</h3>
              <div className="relative mt-6 flex flex-col gap-6">
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-100" />
                {upcomingEvents.map((event, i) => (
                  <div
                    key={event.title}
                    className="anim-enter relative flex flex-col pl-8"
                    style={{ animationDelay: `${850 + i * 100}ms` }}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-1 h-4 w-4 rounded-full border-4 border-white",
                        event.dotColor,
                        event.active && "rental-timeline-active shadow-sm"
                      )}
                    />
                    <span className={cn("text-[11px] font-semibold uppercase tracking-[0.05em]", event.timeColor)}>{event.time}</span>
                    <span className="text-[14px] sm:text-[15px] font-semibold text-val-heading">{event.title}</span>
                    <span className="text-[12px] text-slate-400">{event.detail}</span>
                  </div>
                ))}
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
}
