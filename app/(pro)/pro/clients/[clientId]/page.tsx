import { notFound } from "next/navigation";
import {
  getClientById,
  getClientOverview,
} from "@/app/(pro)/pro/_data/mock";
import { ClientPortfolioPage } from "./_components/ClientPortfolioPage";

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const client = getClientById(clientId);
  const overview = getClientOverview(clientId);

  if (!client || !overview) {
    notFound();
  }

  return <ClientPortfolioPage client={client} overview={overview} />;
}
