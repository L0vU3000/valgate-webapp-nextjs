import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { MaintenanceQueueCard } from "@/app/(pro)/pro/dashboard/_components/MaintenanceQueueCard";

// Work Orders section of the manager's client workspace — the Dashboard's
// MaintenanceQueueCard scoped to this one client (open items). Manager cockpit
// view. Reuses getClientPortfolioData.
// ponytail: v1 shows the open queue like the Overview; a richer tab (incl.
// resolved + WorkOrderStatusCard) is a flagged fast-follow.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getClientPortfolioData(clientId);
  if (!data) {
    notFound();
  }

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <MaintenanceQueueCard
          queue={data.workOrders.filter((w) => w.status !== "Resolved")}
        />
      </div>
    </main>
  );
}
