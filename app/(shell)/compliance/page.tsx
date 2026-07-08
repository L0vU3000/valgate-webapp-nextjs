import { CompliancePage } from "./_components/CompliancePage";
import { getComplianceData } from "./queries";

export default async function Page() {
  const data = await getComplianceData();
  return <CompliancePage data={data} />;
}
