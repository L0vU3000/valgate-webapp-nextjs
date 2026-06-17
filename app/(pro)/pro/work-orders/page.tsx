import { getWorkOrdersPageData } from "../queries";
import { WorkOrdersPage } from "./_components/WorkOrdersPage";

// /pro/work-orders — maintenance coordination across the whole book.
// Real MaintenanceItem records joined to properties, clients and the
// Professional directory (the vendor pool). Creating, assigning and
// advancing work orders writes through the real server actions.

// Time-relative derivations (alerts, "expires in Nd") must use request time, not build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getWorkOrdersPageData();
  return <WorkOrdersPage data={data} />;
}
