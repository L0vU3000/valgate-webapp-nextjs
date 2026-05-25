"use client";

import { KpiMetricStrip } from "@/app/(pro)/pro/_components/KpiMetricStrip";
import type { ClientKpi } from "@/app/(pro)/pro/_data/mock";

type Props = {
  kpis: ClientKpi[];
};

export function ClientKpiBanner({ kpis }: Props) {
  return (
    <KpiMetricStrip metrics={kpis} ariaLabel="Portfolio key metrics" />
  );
}
