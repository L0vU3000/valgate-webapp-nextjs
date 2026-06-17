import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { ClientPortfolioPage } from "./_components/ClientPortfolioPage";

// /pro/clients/[clientId] — one owner-client's portfolio, scoped from
// the same shared entities as the dashboard (Property.clientId is the
// partition key). Includes the monthly owner statement.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getClientPortfolioData(clientId);

  if (!data) {
    notFound();
  }

  return <ClientPortfolioPage data={data} />;
}
