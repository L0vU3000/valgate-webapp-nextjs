import { getHomePageData } from "@/app/(shell)/queries";
import { HomePage } from "@/app/(shell)/_components/HomePage";
import { requirePreviewContext } from "./_ctx";

// Home section of the "View as client" preview. The chrome lives in layout.tsx;
// this segment only fetches + renders the client's home view (map + portfolio),
// scoped to the client's org via the shared read-only viewer Ctx.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const { viewerCtx } = await requirePreviewContext(clientId);

  const homeData = await getHomePageData(viewerCtx);

  return (
    <HomePage
      initialProperties={homeData.properties}
      portfolioStats={homeData.portfolioStats}
      documents={homeData.documents}
    />
  );
}
