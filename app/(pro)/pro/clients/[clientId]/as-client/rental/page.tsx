import { getRentalDashboardData } from "@/app/(shell)/rental/queries";
import { RentalDashboardPage } from "@/app/(shell)/rental/_components/RentalDashboardPage";
import { requirePreviewContext } from "../_ctx";

// Rental section of the "View as client" preview — scoped to the client's org.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const data = await getRentalDashboardData(viewerCtx);

  return <RentalDashboardPage data={data} readOnly />;
}
