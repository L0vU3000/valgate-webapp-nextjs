import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { ClientWorkOrdersPage } from "../_components/ClientWorkOrdersPage";

// Work Orders section of the manager's client workspace — a client-scoped
// maintenance workspace (status tiles + full work-order table + vendor
// directory). Composes the same widgets the global /pro/work-orders page uses,
// over this one client's slice. Reuses getClientPortfolioData (work-order
// surfaces derived there via deriveWorkOrderSurfaces).

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getClientPortfolioData(clientId);
  if (!data) {
    notFound();
  }

  return <ClientWorkOrdersPage data={data} />;
}
