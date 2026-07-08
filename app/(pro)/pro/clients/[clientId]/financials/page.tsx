import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { ClientFinancialsPage } from "../_components/ClientFinancialsPage";

// Financials section of the manager's client workspace — a client-scoped
// Rent & Collections + Owner Statement workspace. Composes the same widgets
// the global /pro/rent page and the Overview tab use, over this one client's
// slice. Reuses getClientPortfolioData (rent surfaces derived there).

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getClientPortfolioData(clientId);
  if (!data) {
    notFound();
  }

  return <ClientFinancialsPage data={data} />;
}
