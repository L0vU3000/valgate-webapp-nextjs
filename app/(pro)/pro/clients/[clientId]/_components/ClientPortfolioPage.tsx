"use client";

import type { Client, ClientOverview } from "@/app/(pro)/pro/_data/mock";
import { ClientPageHeader } from "./ClientPageHeader";
import { ClientKpiBanner } from "./ClientKpiBanner";
import { ClientAlertsStrip } from "./ClientAlertsStrip";
import { ClientAssetsTable } from "./ClientAssetsTable";
import { ClientWorkOrdersCard } from "./ClientWorkOrdersCard";
import { ClientFinancialsCard } from "./ClientFinancialsCard";
import { ClientOccupancyCard } from "./ClientOccupancyCard";
import { ClientComplianceTable } from "./ClientComplianceTable";
import { ClientContactCard } from "./ClientContactCard";
import { ClientActivityFeed } from "./ClientActivityFeed";

type Props = {
  client: Client;
  overview: ClientOverview;
};

export function ClientPortfolioPage({ client, overview }: Props) {
  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <ClientPageHeader client={client} overview={overview} />
        <ClientKpiBanner kpis={overview.kpis} />
        <ClientAlertsStrip alerts={overview.alerts} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
          <div className="flex flex-col gap-6">
            <ClientAssetsTable assets={overview.assets} />
            <ClientWorkOrdersCard workOrders={overview.workOrders} />
          </div>
          <div className="flex flex-col gap-6">
            <ClientFinancialsCard financials={overview.financials} />
            <ClientOccupancyCard occupancy={overview.occupancy} />
            <ClientComplianceTable compliance={overview.compliance} />
            <ClientContactCard contact={overview.contact} />
          </div>
        </div>

        <ClientActivityFeed activity={overview.activity} />
      </div>
    </main>
  );
}
