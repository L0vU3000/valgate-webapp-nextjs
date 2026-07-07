import { getAnalyticsPageData } from "@/app/(shell)/analytics/queries";
import { AnalyticsPage } from "@/app/(shell)/analytics/_components/AnalyticsPage";
import { requirePreviewContext } from "../_ctx";

// Analytics section of the "View as client" preview — scoped to the client's org.
// ponytail: period fixed at "12M" in preview; add a switcher if managers ask for it.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const period = "12M";
  const data = await getAnalyticsPageData(period, viewerCtx);

  return <AnalyticsPage data={data} period={period} />;
}
