import { CompliancePage } from "./_components/CompliancePage";
import { getCompliancePageData } from "../queries";

// /pro/compliance — the cross-client compliance oversight page.
//
// Server component: loads the certification expiry timeline, the open
// safety-risk register, and the recent-inspection log (all joined to
// their property + owning client) plus the client list and book-level
// summary, then hands them to the filterable client-side page.

// "in 7d" / "Overdue 73d" labels and the day buckets must be computed
// relative to request time, not build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getCompliancePageData();
  return <CompliancePage data={data} />;
}
