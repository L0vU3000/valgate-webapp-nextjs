import { AddPropertyFlow } from "./_components/AddPropertyFlow";
import { getAddPropertyPageData } from "./queries";

export default async function Page() {
  const { drafts } = await getAddPropertyPageData();

  return <AddPropertyFlow drafts={drafts} />;
}
