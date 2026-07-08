"use client";

import { useState } from "react";
import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { CertTimeline } from "@/app/(pro)/pro/compliance/_components/CertTimeline";
import { SafetyRisksCard } from "@/app/(pro)/pro/compliance/_components/SafetyRisksCard";
import { InspectionsCard } from "@/app/(pro)/pro/compliance/_components/InspectionsCard";
import { cn } from "@/components/ui/utils";
import type { ClientPortfolioData } from "@/app/(pro)/pro/queries";

// The client Compliance tab — a certification + safety-risk + inspection
// workspace scoped to one client. Composes the same widgets the global
// /pro/compliance page ships, over this client's slice (see
// deriveComplianceSurfaces in queries.ts). No new derivation lives here.
// It drops the global page's client-filter chip row (a single client) and the
// breadcrumb header (the workspace shell already provides tab chrome — matches
// ClientFinancialsPage).

export function ClientCompliancePage({
  data,
}: {
  data: ClientPortfolioData;
}) {
  const { rollup, complianceSummary: summary } = data;

  // When off (default) only open risks show; when on, resolved risks are also
  // shown (read-only) so they stay reviewable. Same behavior as the global page.
  const [showResolved, setShowResolved] = useState(false);
  const visibleRisks = data.safetyRisks.filter(
    (risk) => showResolved || risk.status === "Open",
  );

  // Five metrics — matches KpiMetricStrip's 5-wide grid so they sit on one row
  // at desktop width. Identical to the global /pro/compliance strip, scoped.
  const metrics = [
    {
      value: String(summary.validCount),
      label: "Valid Certs",
      subLabel: "In good standing",
    },
    {
      value: String(summary.expiringCount),
      label: "Expiring Certs",
      subLabel: "Renew soon",
    },
    {
      value: String(summary.expiredCount),
      label: "Expired Certs",
      subLabel: "Action required",
    },
    {
      value: String(summary.openRiskCount),
      label: "Open Risks",
      subLabel:
        summary.resolvedRiskCount > 0
          ? `${summary.highRiskCount} critical/high · ${summary.resolvedRiskCount} resolved`
          : `${summary.highRiskCount} critical/high`,
    },
    {
      value: String(summary.failedInspections),
      label: "Failed Inspections",
      subLabel: "Across all records",
    },
  ];

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <KpiMetricStrip
          metrics={metrics}
          ariaLabel={`Compliance for ${rollup.client.name}`}
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.85fr_1fr]">
          <CertTimeline certifications={data.compliance} hideClient />
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-end">
                {/* "Show resolved" toggle. Disabled when there are no resolved
                    risks at all, so it never offers an empty view. */}
                <label
                  className={cn(
                    "inline-flex items-center gap-2 text-[12px] font-medium text-slate-600 dark:text-slate-300",
                    summary.resolvedRiskCount === 0 &&
                      "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={showResolved}
                    disabled={summary.resolvedRiskCount === 0}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                  />
                  Show resolved ({summary.resolvedRiskCount})
                </label>
              </div>
              <SafetyRisksCard
                risks={visibleRisks}
                title={showResolved ? "Safety Risks" : "Open Safety Risks"}
                emptyMessage={
                  showResolved
                    ? "No safety risks on record."
                    : "No open safety risks."
                }
                hideClient
              />
            </div>
            <InspectionsCard inspections={data.inspections} hideClient />
          </div>
        </div>
      </div>
    </main>
  );
}
