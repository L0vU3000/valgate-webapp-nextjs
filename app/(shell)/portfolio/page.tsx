import { PortfolioPage } from "./_components/PortfolioPage";
import { getPortfolioPageData } from "./queries";

export default async function Page({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const data = await getPortfolioPageData({ showArchived: archived === "true" });
  return <PortfolioPage data={data} />;
}
