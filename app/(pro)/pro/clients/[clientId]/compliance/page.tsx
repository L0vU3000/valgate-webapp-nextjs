import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { ClientCompliancePage } from "../_components/ClientCompliancePage";

// Compliance section of the manager's client workspace — a client-scoped
// certification timeline + safety-risk register + inspection log. Composes the
// same widgets the global /pro/compliance page uses, over this one client's
// slice. Reuses getClientPortfolioData (compliance surfaces derived there).

// "Overdue" / "in Nd" horizon labels are computed relative to request time.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getClientPortfolioData(clientId);
  if (!data) {
    notFound();
  }

  return <ClientCompliancePage data={data} />;
}
