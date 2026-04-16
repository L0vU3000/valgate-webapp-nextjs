import { HomePage } from "./_components/HomePage";
import { getHomePageData } from "./queries";

export default async function Page() {
  const { properties, portfolioStats } = await getHomePageData();
  return <HomePage initialProperties={properties} portfolioStats={portfolioStats} />;
}
