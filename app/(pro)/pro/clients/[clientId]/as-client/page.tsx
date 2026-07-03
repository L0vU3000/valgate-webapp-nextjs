import { notFound } from "next/navigation";
import { resolveClientOrgForManager } from "@/app/(pro)/pro/queries";
import { getHomePageData } from "@/app/(shell)/queries";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { ClientViewPreview } from "./_components/ClientViewPreview";
import type { Ctx } from "@/lib/services/_mapping";

// /pro/clients/[clientId]/as-client — read-only "View as client" preview.
//
// Renders the owner-facing home view (map + portfolio) exactly as the client
// sees it, scoped to the client's portfolio org. No Clerk org switch: the
// manager stays in their own session and we build a client-scoped Ctx server-side.
// Also fetches leases/tenants/payments so the manager's propose-changes panel
// can offer add/edit/delete across all Tier 1 entities.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;

  // Authz: only the manager who owns this client may preview it. Returns null
  // when it's not their client or the client has no portfolio org yet → 404.
  const resolved = await resolveClientOrgForManager(clientId);
  if (!resolved) {
    notFound();
  }

  // Viewer ctx for reading the client's portfolio data without write access.
  // orgId routes every read to the client's portfolio org.
  const viewerCtx: Ctx = {
    userId: resolved.managerUserId,
    orgId: resolved.orgId,
    orgRole: "viewer",
  };

  // Fetch all portfolio data in parallel: home page data + Tier 1 entity lists.
  const [homeData, allLeases, allTenants, allPayments] = await Promise.all([
    getHomePageData(viewerCtx),
    listLeases(viewerCtx),
    listTenants(viewerCtx),
    listPayments(viewerCtx),
  ]);

  return (
    <ClientViewPreview
      clientId={clientId}
      clientName={resolved.name}
      clientInitials={resolved.initials}
      properties={homeData.properties}
      portfolioStats={homeData.portfolioStats}
      documents={homeData.documents}
      leases={allLeases}
      tenants={allTenants}
      payments={allPayments}
    />
  );
}
