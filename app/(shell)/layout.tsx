import { redirect } from "next/navigation";
import { ShellLayout } from "@/components/layout/ShellLayout";
import { requireCtx } from "@/lib/auth/ctx";
import { getIsManager, listManagedAccounts } from "@/lib/services/managers";
import { listProperties } from "@/lib/services/properties";
import { listNotifications } from "@/lib/services/notifications";
import type { PropertyListItem } from "@/lib/data/types/property";
import { formatCurrency } from "@/lib/format";
import { AppHeaderProperties } from "@/components/layout/AppHeaderPropertiesContext";
import { NotificationsProvider } from "@/components/layout/NotificationsContext";
import { ManagerContextBanner } from "@/components/layout/ManagerContextBanner";

// Every shell route reads per-org data from Neon behind auth (requireCtx) — inherently dynamic,
// never statically prerenderable. Matches the (pro) pages, which already opt out of static gen.
export const dynamic = "force-dynamic";

export default async function ShellGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authCtx = await requireCtx();

  // Fetch manager status + granted accounts in parallel.
  // listManagedAccounts returns [] for non-managers so it's safe to always call.
  const [isManager, accounts] = await Promise.all([
    getIsManager(authCtx),
    listManagedAccounts(authCtx),
  ]);

  // Find whether the currently active org is one of the manager's granted owner orgs.
  // - isManager + activeGranted: manager is viewing an owner portfolio → show banner, render shell.
  // - isManager + no activeGranted: manager is in their home org → redirect to /pro.
  // - !isManager: normal owner → fall through, no banner.
  const activeGranted = isManager
    ? (accounts.find((a) => a.orgId === authCtx.orgId) ?? null)
    : null;

  if (isManager && !activeGranted) {
    redirect("/pro/dashboard");
  }

  const [properties, notifications] = await Promise.all([
    listProperties(authCtx),
    listNotifications(authCtx),
  ]);
  const slim: PropertyListItem[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    province: p.province,
    status: p.status,
    buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—",
    buyNumeric: p.buyNumeric ?? 0,
    progress: 0,
    totalArea: p.totalArea,
    title: p.title,
  }));

  return (
    <>
      {activeGranted && (
        <ManagerContextBanner
          orgName={activeGranted.name}
          grantedClerkOrgIds={accounts.map((a) => a.clerkOrgId)}
        />
      )}
      <ShellLayout>
        <NotificationsProvider notifications={notifications}>
          <AppHeaderProperties properties={slim}>{children}</AppHeaderProperties>
        </NotificationsProvider>
      </ShellLayout>
    </>
  );
}
