import { ProfessionalDirectoryPage } from "./_components/ProfessionalDirectoryPage";
import { getDirectoryPageData } from "./queries";

export default async function Page() {
  const data = await getDirectoryPageData();
  return <ProfessionalDirectoryPage data={data} />;
}
