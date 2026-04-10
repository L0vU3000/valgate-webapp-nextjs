import { SuccessionPage } from "./_components/SuccessionPage";
import { getEstatePlanningPageData } from "./queries";

export default async function Page() {
  const data = await getEstatePlanningPageData();
  return <SuccessionPage data={data} />;
}
