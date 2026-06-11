"use client";

import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { formatCurrencyFull } from "@/lib/format";
import type { ClientRollup } from "@/app/(pro)/pro/queries";

// KPI banner for one client — five stats from the client's rollup.
// Same derivations as the dashboard, scoped to this client's
// properties, leases and payments.

export function ClientKpiBanner({ rollup }: { rollup: ClientRollup }) {
  const metrics = [
    {
      value: rollup.totalValueFormatted,
      label: "Portfolio Value",
      subLabel: `${rollup.propertyCount} active properties`,
    },
    {
      value: `${rollup.occupancyRate}%`,
      label: "Occupancy",
      subLabel: `${rollup.rentedCount} rented · ${rollup.vacantCount} vacant`,
    },
    {
      value: `${rollup.collectionRate}%`,
      label: "Collected this month",
      subLabel: `${formatCurrencyFull(rollup.monthlyCollected)} of ${formatCurrencyFull(rollup.monthlyExpected)}`,
    },
    {
      value: formatCurrencyFull(rollup.noiMonthly),
      label: "Est. Monthly NOI",
      subLabel: "Rent − tax, insurance & maintenance",
    },
    {
      value: `${rollup.avgProgress}%`,
      label: "Avg. Data Completeness",
      subLabel: "Progress score across properties",
    },
  ];

  return (
    <KpiMetricStrip metrics={metrics} ariaLabel="Client portfolio metrics" />
  );
}
