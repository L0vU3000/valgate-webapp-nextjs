import { getProDashboardData, getInactiveClients } from "../queries";
import { ClientsIndexPage } from "./_components/ClientsIndexPage";

// /pro/clients — the manager's book of business: every client with
// real rollups, plus the onboarding flow (create client + assign
// unassigned properties).

// Time-relative derivations (alerts, "expires in Nd") must use request time, not build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Load active client rollups and inactive clients in parallel — they come
  // from different paths (loadProContext filters to active; getInactiveClients
  // reads the raw list and filters to inactive only).
  const [data, inactiveClients] = await Promise.all([
    getProDashboardData(),
    getInactiveClients(),
  ]);

  // Properties not yet assigned to any client are offered during onboarding.
  const unassignedProperties = data.properties
    .filter((p) => p.clientId === "")
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <ClientsIndexPage
      clients={data.clients}
      inactiveClients={inactiveClients}
      unassignedProperties={unassignedProperties}
    />
  );
}
