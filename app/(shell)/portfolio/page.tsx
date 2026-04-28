import { PortfolioPage } from "./_components/PortfolioPage";
import { getPortfolioPageData } from "./queries";

export default async function Page() {
  const data = await getPortfolioPageData();
  return <PortfolioPage data={data} />;
}
