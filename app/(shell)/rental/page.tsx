import { RentalDashboardPage } from "./_components/RentalDashboardPage";
import { getRentalDashboardData } from "./queries";

export default async function Page() {
  const data = await getRentalDashboardData();
  return <RentalDashboardPage data={data} />;
}
