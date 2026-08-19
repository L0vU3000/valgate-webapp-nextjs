import { HomePage } from "../_components/HomePage";
import { getHomePageData } from "../queries";

// Permanent authenticated app-home (public-launch-plan Step 1.1). "/" still serves the
// same page as a temporary alias until the marketing-site phase moves it to the landing page.
export default async function Page() {
  const { properties, portfolioStats, documents } = await getHomePageData();
  return <HomePage initialProperties={properties} portfolioStats={portfolioStats} documents={documents} />;
}
