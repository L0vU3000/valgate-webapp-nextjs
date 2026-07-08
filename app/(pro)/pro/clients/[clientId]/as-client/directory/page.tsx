import { getDirectoryPageData } from "@/app/(shell)/directory/queries";
import { ProfessionalDirectoryPage } from "@/app/(shell)/directory/_components/ProfessionalDirectoryPage";
import { requirePreviewContext } from "../_ctx";

// Directory section of the "View as client" preview — scoped to the client's org.
// Read-only: professional is registered in the change-request dispatcher, but
// ProposeChangePanel has no form for it yet (deferred, see align-client-manager-parity
// tasks.md 3.3), so inline add/edit/delete stay off here rather than writing to the
// manager's own org (the wizard's actions call requireCtx(), not viewerCtx).

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const data = await getDirectoryPageData(viewerCtx);

  return <ProfessionalDirectoryPage data={data} readOnly />;
}
