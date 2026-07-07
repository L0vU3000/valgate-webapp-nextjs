import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { FinancialsCard } from "@/app/(pro)/pro/dashboard/_components/FinancialsCard";
import { OccupancyCard } from "@/app/(pro)/pro/dashboard/_components/OccupancyCard";

// Financials section of the manager's client workspace — the Dashboard's
// FinancialsCard + OccupancyCard scoped to this one client. Same per-slice props
// the Overview uses (see ClientPortfolioPage). Reuses getClientPortfolioData.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getClientPortfolioData(clientId);
  if (!data) {
    notFound();
  }

  const { rollup } = data;

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-6 px-4 py-6 sm:px-8 sm:py-8 lg:grid-cols-2">
        <FinancialsCard
          financials={{
            expected: rollup.monthlyExpected,
            collected: rollup.monthlyCollected,
            outstanding: rollup.outstanding,
            series: data.financialSeries,
          }}
          monthLabel="This month"
        />
        <OccupancyCard
          occupancy={{
            rented: rollup.rentedCount,
            vacant: rollup.vacantCount,
            occupancyRate: rollup.occupancyRate,
            leasesExpiring90d: data.leasesExpiring90d,
          }}
        />
      </div>
    </main>
  );
}
