import { getComplianceData } from "@/app/(shell)/compliance/queries";
import { CompliancePage } from "@/app/(shell)/compliance/_components/CompliancePage";
import { requirePreviewContext } from "../_ctx";

// Compliance section of the "View as client" preview — scoped to the client's org.
// Read-only: the manager acts through the audited ProposeChangePanel (certification /
// inspection / safety-risk are registered in the change-request dispatcher).

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const data = await getComplianceData(viewerCtx);

  return <CompliancePage data={data} readOnly />;
}
