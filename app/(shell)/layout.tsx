import { ShellLayout } from "@/components/layout/ShellLayout";
import { requireCtx } from "@/lib/auth/ctx";
import { stampLastActiveAt } from "@/lib/services/identity-sync";
import { listProperties } from "@/lib/services/properties";
import { listNotifications } from "@/lib/services/notifications";
import { getPendingWelcome } from "@/lib/services/client-onboarding";
import type { PropertyListItem } from "@/lib/data/types/property";
import { formatCurrency } from "@/lib/format";
import { AppHeaderProperties } from "@/components/layout/AppHeaderPropertiesContext";
import { NotificationsProvider } from "@/components/layout/NotificationsContext";
import { ClientWelcomeBanner } from "@/components/layout/ClientWelcomeBanner";

// Every shell route reads per-org data from Neon behind auth (requireCtx) — inherently dynamic,
// never statically prerenderable. Matches the (pro) pages, which already opt out of static gen.
export const dynamic = "force-dynamic";

export default async function ShellGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authCtx = await requireCtx();
  // Track owner-side activity so managers see presence dots in the Pro sidebar.
  await stampLastActiveAt(authCtx.userId);

  const [properties, notifications, pendingWelcome] = await Promise.all([
    listProperties(authCtx),
    listNotifications(authCtx),
    getPendingWelcome(authCtx),
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
      {pendingWelcome && (
        <ClientWelcomeBanner
          handoffId={pendingWelcome.handoffId}
          portfolioName={pendingWelcome.portfolioName}
          managerName={pendingWelcome.managerName}
        />
      )}
      <AppHeaderProperties properties={slim}>
        <ShellLayout>
          <NotificationsProvider notifications={notifications}>
            {children}
          </NotificationsProvider>
        </ShellLayout>
      </AppHeaderProperties>
    </>
  );
}
