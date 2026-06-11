import { ManagerDashboardPage } from "./_components/ManagerDashboardPage";
import { getProDashboardData } from "../queries";

// /pro/dashboard — Valgate Professional manager dashboard.
//
// Server component: loads the full dashboard payload (book-level KPIs,
// per-client rollups, alerts, work orders, compliance, activity — all
// derived from the shared local-db entities) and hands it to the
// client-side composition.

// Time-relative derivations (alerts, "expires in Nd") must use request time, not build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getProDashboardData();
  return <ManagerDashboardPage data={data} />;
}
