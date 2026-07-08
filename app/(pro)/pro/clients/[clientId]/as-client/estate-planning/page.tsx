import { getEstatePlanningPageData } from "@/app/(shell)/estate-planning/queries";
import { SuccessionPage } from "@/app/(shell)/estate-planning/_components/SuccessionPage";
import { requirePreviewContext } from "../_ctx";

// Estate Planning section of the "View as client" preview — scoped to the client's org.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const data = await getEstatePlanningPageData(viewerCtx);

  return <SuccessionPage data={data} />;
}
