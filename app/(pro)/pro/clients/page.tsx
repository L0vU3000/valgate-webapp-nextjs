import { Suspense } from "react";
import { getProDashboardData, getInactiveClients } from "../queries";
import { ClientsIndexPage } from "./_components/ClientsIndexPage";
import { countUnconfirmedClients } from "@/lib/services/client-onboarding";
import { getMyUserProfile } from "@/lib/services/user-profiles";
import { listMyAccessRequests } from "@/lib/services/managers";
import { requireCtx } from "@/lib/auth/ctx";

// /pro/clients — the manager's book of business: every client with
// real rollups, plus the unified Add Client modal (create new or
// connect to existing via invite code).

export const dynamic = "force-dynamic";

export default async function Page() {
  const authCtx = await requireCtx();

  const [data, inactiveClients, unconfirmedCount, profile, requests] =
    await Promise.all([
      getProDashboardData(),
      getInactiveClients(),
      countUnconfirmedClients(authCtx.userId),
      getMyUserProfile(authCtx),
      listMyAccessRequests(authCtx),
    ]);

  const unassignedProperties = data.properties
    .filter((p) => p.clientId === "")
    .map((p) => ({ id: p.id, name: p.name }));

  const managerName =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : "your account";
  const managerEmail = profile?.email ?? "";

  const requestRows = requests.map((r) => ({
    id: r.id,
    ownerOrgName: r.ownerOrgName,
    requestedLevel: r.requestedLevel,
    status: r.status,
    createdAt: r.createdAt.getTime(),
  }));

  return (
    <Suspense fallback={null}>
      <ClientsIndexPage
        clients={data.clients}
        inactiveClients={inactiveClients}
        unassignedProperties={unassignedProperties}
        unconfirmedCount={unconfirmedCount}
        managerName={managerName}
        managerEmail={managerEmail}
        requests={requestRows}
      />
    </Suspense>
  );
}
