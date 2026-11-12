import { DocumentsVaultPage } from "./_components/DocumentsVaultPage";
import { getDocumentsVaultPageData } from "./queries";

// This page is a viewer: search, filters, and pagination are all client-side state,
// so it reads no searchParams and the query module does the whole fetch.
export default async function Page() {
  const data = await getDocumentsVaultPageData();
  return <DocumentsVaultPage data={data} />;
}
