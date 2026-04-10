"use client";

import { useState } from "react";
import {
  Plus,
  Building2,
  FileText,
  Download,
  TrendingUp,
  Search,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { KpiCards } from "@/components/rental/KpiCards";
import { HeatmapGrid } from "@/components/rental/HeatmapGrid";
import { LeaseTable } from "@/components/rental/LeaseTable";
import type { RentalDashboardData } from "../queries";

/* -------------------------------------------------------------------------- */
/*  Static UI Config                                                          */
/* -------------------------------------------------------------------------- */

const navLinks = ["Portfolio", "Units", "Leases", "Financials"] as const;

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export function RentalDashboardPage({ data }: { data: RentalDashboardData }) {
  const [activeNav, setActiveNav] = useState<string>("Units");

  const { pipelineStages, arrearsBuckets, maintenanceItems, upcomingEvents } = data;

  return (
    <div className="rental-animate flex h-full flex-col bg-surface-page">
      {/* ------------------------------------------------------------------ */}
      {/*  Top Bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <header className="anim-enter shrink-0 border-b border-border-default bg-white px-8 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: brand + nav */}
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold text-slate-900">
              Rental Dashboard
            </span>
            <nav className="flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link}
                  onClick={() => setActiveNav(link)}
                  className={cn(
                    "text-base transition-all duration-200",
                    activeNav === link
                      ? "border-b-2 border-blue-600 pb-1.5 font-medium text-blue-600"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {link}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: search + icons */}
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search portfolio..."
                className="w-64 rounded-xl bg-slate-50 py-1.5 pl-9 pr-4 text-sm text-foreground placeholder:text-slate-400 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button className="rounded-xl p-2 text-slate-500 transition-colors duration-150 hover:bg-slate-50 active:scale-95">
              <Bell className="h-5 w-5" />
            </button>
            <button className="rounded-xl p-2 text-slate-500 transition-colors duration-150 hover:bg-slate-50 active:scale-95">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*  Content                                                           */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex flex-col gap-8">
          {/* ============================================================== */}
          {/*  Zone 1: Hero Vitals                                           */}
          {/* ============================================================== */}
          <KpiCards />

          {/* ============================================================== */}
          {/*  Zone 2: Quick Actions                                         */}
          {/* ============================================================== */}
          <section
            className="anim-enter flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            style={{ animationDelay: "300ms" }}
          >
            <span className="border-r border-slate-200 pr-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Actions
            </span>
            <button className="flex items-center gap-2 rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-blue-900 active:scale-95">
              <Plus className="h-4 w-4" />
              New Lease
            </button>
            <button className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95">
              <Building2 className="h-4 w-4" />
              Add Property
            </button>
            <button className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95">
              <FileText className="h-4 w-4" />
              Portfolio Report
            </button>
            <button className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <div className="flex-1" />
            <button className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition-all duration-150 hover:bg-blue-100 active:scale-95">
              <TrendingUp className="h-4 w-4" />
              Bulk Increase
            </button>
          </section>

          {/* ============================================================== */}
          {/*  Zone 3: Asymmetric — Table + Heatmap                          */}
          {/* ============================================================== */}
          <section className="grid grid-cols-12 gap-6">
            <LeaseTable />
            <HeatmapGrid />
          </section>

          {/* ============================================================== */}
          {/*  Zone 4: Lease Renewal Pipeline                                */}
          {/* ============================================================== */}
          <section
            className="anim-enter overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            style={{ animationDelay: "550ms" }}
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                Lease Renewal Pipeline
              </h2>
            </div>
            <div className="flex divide-x divide-slate-100">
              {pipelineStages.map((stage, si) => (
                <div key={stage.label} className="flex flex-1 flex-col gap-4 p-6">
                  {/* Stage header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        stage.color
                      )}
                    >
                      {stage.label}
                    </span>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-semibold",
                        stage.countBg
                      )}
                    >
                      {stage.count}
                    </span>
                  </div>

                  {/* Cards */}
                  {stage.cards.map((card, ci) => (
                    <div
                      key={card.unit}
                      className={cn(
                        "anim-enter rounded border border-slate-200 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        stage.borderColor && `border-l-4 ${stage.borderColor}`,
                        card.faded && "opacity-50"
                      )}
                      style={{ animationDelay: `${650 + si * 100 + ci * 60}ms` }}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {card.unit}
                      </p>
                      <p className="text-xs text-slate-500">{card.detail}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================== */}
          {/*  Zone 5: Bottom Triptych                                       */}
          {/* ============================================================== */}
          <section className="grid grid-cols-12 gap-6 pb-8">
            {/* Rent Collection & Arrears */}
            <div
              className="anim-enter col-span-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: "700ms" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Rent Collection &amp; Arrears
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  Aging Buckets
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {arrearsBuckets.map((bucket, i) => (
                  <div
                    key={bucket.label}
                    className="flex items-center gap-4"
                  >
                    <span className="w-12 text-right text-xs font-semibold text-slate-400">
                      {bucket.label}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-slate-50 h-8">
                      <div
                        className={cn("rental-bar h-full", bucket.color)}
                        style={{
                          width: bucket.width,
                          animationDelay: `${900 + i * 120}ms`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      {bucket.amount}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer stats */}
              <div className="mt-6 flex items-start justify-around border-t border-slate-100 pt-5">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Recovery Rate
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    98.2%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Eviction Risk
                  </p>
                  <p className="text-xl font-semibold text-red-700">
                    4 Units
                  </p>
                </div>
              </div>
            </div>

            {/* Maintenance Exposure */}
            <div
              className="anim-enter col-span-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: "780ms" }}
            >
              <h3 className="text-base font-bold text-slate-900">
                Maintenance<br />Exposure
              </h3>

              <div className="mt-6 flex flex-col gap-4">
                {maintenanceItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", item.color)} />
                      <span className="text-sm font-medium text-slate-700">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Top spend */}
              <p className="mt-6 text-[10px] font-semibold uppercase text-slate-400">
                Top Spend Category
              </p>
              <div className="mt-2 rounded bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">
                    HVAC / Systems
                  </span>
                  <span className="text-xs font-semibold text-blue-700">
                    $3,240
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="rental-bar h-full rounded-full bg-blue-700"
                    style={{ width: "66.6%", animationDelay: "1000ms" }}
                  />
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div
              className="anim-enter-right col-span-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: "750ms" }}
            >
              <h3 className="text-base font-bold text-slate-900">
                Upcoming Events
              </h3>

              <div className="relative mt-6 flex flex-col gap-6">
                {/* Vertical timeline line */}
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-100" />

                {upcomingEvents.map((event, i) => (
                  <div
                    key={event.title}
                    className="anim-enter relative flex flex-col pl-8"
                    style={{ animationDelay: `${850 + i * 100}ms` }}
                  >
                    {/* Dot */}
                    <div
                      className={cn(
                        "absolute left-0 top-1 h-4 w-4 rounded-full border-4 border-white",
                        event.dotColor,
                        event.active && "rental-timeline-active shadow-sm"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        event.timeColor
                      )}
                    >
                      {event.time}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {event.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {event.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
