import { listProperties } from "@/lib/services/properties";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { ClientPreviewShell } from "./_components/ClientPreviewShell";
import { requirePreviewContext } from "./_ctx";

// /pro/clients/[clientId]/as-client — "View as client" preview shell.
//
// Owns the preview chrome (exit bar, preview Sidebar, blue-glow frame, and the
// Propose-changes panel) so it persists while {children} — the active section —
// swaps. Fetches the Tier 1 entity lists the propose panel needs, scoped to the
// client's org via a read-only viewer Ctx. Each section page.tsx fetches its own
// section data with the same viewer Ctx.

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
};

export default async function AsClientLayout({ children, params }: LayoutProps) {
  const { clientId } = await params;
  const { viewerCtx, clientName, clientInitials, canWrite } = await requirePreviewContext(clientId);

  // Panel data: Tier 1 entities the manager can propose add/edit/delete against.
  const [properties, leases, tenants, payments] = await Promise.all([
    listProperties(viewerCtx),
    listLeases(viewerCtx),
    listTenants(viewerCtx),
    listPayments(viewerCtx),
  ]);

  return (
    <ClientPreviewShell
      clientId={clientId}
      clientName={clientName}
      clientInitials={clientInitials}
      previewBasePath={`/pro/clients/${clientId}/as-client`}
      canWrite={canWrite}
      properties={properties}
      leases={leases}
      tenants={tenants}
      payments={payments}
    >
      {children}
    </ClientPreviewShell>
  );
}
