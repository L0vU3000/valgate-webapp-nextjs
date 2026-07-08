import { getPortfolioPageData } from "@/app/(shell)/portfolio/queries";
import { PortfolioPage } from "@/app/(shell)/portfolio/_components/PortfolioPage";
import { requirePreviewContext } from "../_ctx";

// Portfolio section of the "View as client" preview — scoped to the client's org.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const data = await getPortfolioPageData({}, viewerCtx);

  return <PortfolioPage data={data} readOnly />;
}
