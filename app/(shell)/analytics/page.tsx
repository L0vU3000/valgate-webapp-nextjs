import { AnalyticsPage } from "./_components/AnalyticsPage";
import { getAnalyticsPageData } from "./queries";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const resolvedPeriod = period ?? "12M";
  const data = await getAnalyticsPageData(resolvedPeriod);
  return <AnalyticsPage data={data} period={resolvedPeriod} />;
}
