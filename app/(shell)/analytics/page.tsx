import { AnalyticsPage } from "./_components/AnalyticsPage";
import { getAnalyticsPageData } from "./queries";

export default async function Page() {
  const data = await getAnalyticsPageData();
  return <AnalyticsPage data={data} />;
}
