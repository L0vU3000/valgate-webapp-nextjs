import { AgentHubPage } from "./_components/AgentHubPage";
import { getAgentHubData } from "../queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getAgentHubData();
  return <AgentHubPage data={data} />;
}
