import { getWorkOrdersData } from "@/app/(shell)/work-orders/queries";
import { WorkOrdersPage } from "@/app/(shell)/work-orders/_components/WorkOrdersPage";
import { requirePreviewContext } from "../_ctx";

// Work Orders section of the "View as client" preview — scoped to the client's org.
// Read-only: the manager acts on the portfolio through the audited ProposeChangePanel
// (maintenance-item is registered in the change-request dispatcher), never inline here.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const { board, properties } = await getWorkOrdersData(viewerCtx);

  return <WorkOrdersPage data={board} properties={properties} readOnly />;
}
