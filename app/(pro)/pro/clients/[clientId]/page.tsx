import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { requireCtx } from "@/lib/auth/ctx";
import { listForManager } from "@/lib/services/change-requests";
import { ClientPortfolioPage } from "./_components/ClientPortfolioPage";

// /pro/clients/[clientId] — one owner-client's portfolio, scoped from
// the same shared entities as the dashboard (Property.clientId is the
// partition key). Includes the monthly owner statement.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const [data, ctx] = await Promise.all([
    getClientPortfolioData(clientId),
    requireCtx(),
  ]);

  if (!data) {
    notFound();
  }

  // Load change requests this manager has submitted for this client's org.
  // Null orgId means no portfolio org yet — skip the query.
  const changeRequests = data.rollup.client.orgId
    ? await listForManager(ctx, data.rollup.client.orgId)
    : [];

  return <ClientPortfolioPage data={data} changeRequests={changeRequests} />;
}
