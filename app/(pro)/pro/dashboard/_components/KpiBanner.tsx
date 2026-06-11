"use client";

import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { formatCurrencyFull } from "@/lib/format";
import type { ProKpis } from "../../queries";

// KPI banner — five book-level stats, every one derived in the query
// layer from real entities (properties, leases, payments, maintenance).
// No fake deltas: where a real comparison doesn't exist, the cell shows
// a factual sub-label instead.

export function KpiBanner({ kpis }: { kpis: ProKpis }) {
  const metrics = [
    {
      value: kpis.totalValueFormatted,
      label: "Total Portfolio Value",
      subLabel: `${kpis.propertyCount} active properties`,
    },
    {
      value: String(kpis.clientCount),
      label: "Active Clients",
      subLabel: "Owner engagements",
    },
    {
      value: `${kpis.occupancyRate}%`,
      label: "Occupancy",
      subLabel: "Rented share of active properties",
    },
    {
      value: `${kpis.collectionRate}%`,
      label: `Collected — ${kpis.monthLabel}`,
      subLabel: `${formatCurrencyFull(kpis.monthlyCollected)} of ${formatCurrencyFull(kpis.monthlyExpected)}`,
    },
    {
      value: formatCurrencyFull(kpis.noiMonthly),
      label: "Est. Monthly NOI",
      subLabel: "Rent − tax, insurance & maintenance",
    },
  ];

  return (
    <KpiMetricStrip metrics={metrics} ariaLabel="Portfolio overview metrics" />
  );
}
