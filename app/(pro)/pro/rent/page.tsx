import { getRentPageData } from "../queries";
import { RentCollectionsPage } from "./_components/RentCollectionsPage";

// /pro/rent — Rent & Collections across the whole book.
// Rent roll, collection progress, overdue triage, and upcoming lease
// expirations — all derived from real Lease, Payment and Tenant
// records. The action buttons write through the real server actions.

// Time-relative derivations (alerts, "expires in Nd") must use request time, not build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getRentPageData();
  return <RentCollectionsPage data={data} />;
}
