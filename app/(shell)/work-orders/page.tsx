import { WorkOrdersPage } from "./_components/WorkOrdersPage";
import { getWorkOrdersData } from "./queries";

export default async function Page() {
  const { board, properties } = await getWorkOrdersData();
  return <WorkOrdersPage data={board} properties={properties} />;
}
