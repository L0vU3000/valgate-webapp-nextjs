"use client";

import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import { mockKpis } from "../_data/mock";

const METRICS = [
  mockKpis.portfolioValue,
  mockKpis.aum,
  mockKpis.activeClients,
  mockKpis.portfolioRoi,
  mockKpis.noi,
];

export function KpiBanner() {
  return (
    <KpiMetricStrip
      metrics={METRICS}
      ariaLabel="Portfolio overview metrics"
    />
  );
}
