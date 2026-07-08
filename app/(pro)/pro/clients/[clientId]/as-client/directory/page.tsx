import { getDirectoryPageData } from "@/app/(shell)/directory/queries";
import { ProfessionalDirectoryPage } from "@/app/(shell)/directory/_components/ProfessionalDirectoryPage";
import { requirePreviewContext } from "../_ctx";

// Directory section of the "View as client" preview — scoped to the client's org.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const data = await getDirectoryPageData(viewerCtx);

  return <ProfessionalDirectoryPage data={data} />;
}
