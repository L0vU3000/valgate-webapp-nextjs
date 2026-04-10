import { PortfolioPage } from "./_components/PortfolioPage";
import { getProperties } from "@/lib/data/properties";

export default async function Page() {
  const initialProperties = await getProperties();
  return <PortfolioPage initialProperties={initialProperties} />;
}
