"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { SectionEnter } from "@/app/(pro)/pro/_components/motion-primitives";
import { cn } from "@/components/ui/utils";
import type { CompliancePageData } from "@/app/(pro)/pro/queries";
import { CertTimeline } from "./CertTimeline";
import { SafetyRisksCard } from "./SafetyRisksCard";
import { InspectionsCard } from "./InspectionsCard";

// The cross-client compliance oversight page. It composes three real
// record views — the certification expiry timeline, the open safety-risk
// register, and the recent-inspection log — behind one client filter.
//
// The KPI strip stays book-level (the server-computed summary), giving a
// stable read on the whole portfolio's compliance posture. The client
// filter chips only narrow the three section lists, computed client-side
// with useMemo over the server-derived rows.

// Sentinel for the "All clients" chip; a real client id never equals this.
const ALL_CLIENTS = "all";

export function CompliancePage({ data }: { data: CompliancePageData }) {
  const { certifications, safetyRisks, inspections, clients, summary } = data;
  const prefersReducedMotion = useReducedMotion();

  const [activeClientId, setActiveClientId] = useState<string>(ALL_CLIENTS);

  const visibleCertifications = useMemo(() => {
    if (activeClientId === ALL_CLIENTS) return certifications;
    return certifications.filter((cert) => cert.clientId === activeClientId);
  }, [certifications, activeClientId]);

  const visibleRisks = useMemo(() => {
    if (activeClientId === ALL_CLIENTS) return safetyRisks;
    return safetyRisks.filter((risk) => risk.clientId === activeClientId);
  }, [safetyRisks, activeClientId]);

  const visibleInspections = useMemo(() => {
    if (activeClientId === ALL_CLIENTS) return inspections;
    return inspections.filter(
      (inspection) => inspection.clientId === activeClientId,
    );
  }, [inspections, activeClientId]);

  const metrics = [
    {
      value: String(summary.expiredCount),
      label: "Expired Certs",
      subLabel: "Action required",
    },
    {
      value: String(summary.expiringCount),
      label: "Expiring Certs",
      subLabel: "Renew soon",
    },
    {
      value: String(summary.validCount),
      label: "Valid Certs",
      subLabel: "In good standing",
    },
    {
      value: String(summary.openRiskCount),
      label: "Open Risks",
      subLabel: `${summary.highRiskCount} critical/high`,
    },
    {
      value: String(summary.failedInspections),
      label: "Failed Inspections",
      subLabel: "Across all records",
    },
  ];

  // "All clients" plus one chip per owning client.
  const chips = [{ id: ALL_CLIENTS, name: "All clients" }, ...clients];

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <SectionEnter index={0}>
          <header className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
              <span>Valgate Professional</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Compliance
              </span>
            </div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Compliance
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              Certificate expiries, open safety risks, and recent inspections
              across every client
            </p>
          </header>
        </SectionEnter>

        <SectionEnter index={1}>
          <KpiMetricStrip metrics={metrics} ariaLabel="Compliance metrics" />
        </SectionEnter>

        <SectionEnter index={2}>
          <div
            role="tablist"
            aria-label="Filter by client"
            className="flex flex-wrap items-center gap-2"
          >
            {chips.map((chip) => {
              const isActive = chip.id === activeClientId;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveClientId(chip.id)}
                  className={cn(
                    "relative inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-medium transition-colors",
                    isActive
                      ? "text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="compliance-active-chip"
                      className="absolute inset-0 rounded-full bg-blue-600 dark:bg-blue-500"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 500, damping: 38 }
                      }
                    />
                  )}
                  <span className="relative z-10">{chip.name}</span>
                </button>
              );
            })}
          </div>
        </SectionEnter>

        <SectionEnter index={3}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.85fr_1fr]">
            <CertTimeline certifications={visibleCertifications} />
            <div className="flex flex-col gap-6">
              <SafetyRisksCard risks={visibleRisks} />
              <InspectionsCard inspections={visibleInspections} />
            </div>
          </div>
        </SectionEnter>
      </div>
    </main>
  );
}
