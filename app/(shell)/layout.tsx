import { ShellLayout } from "@/components/layout/ShellLayout";
import { requireCtx } from "@/lib/auth/ctx";
import { listProperties } from "@/lib/services/properties";
import { listNotifications } from "@/lib/services/notifications";
import type { PropertyListItem } from "@/lib/data/types/property";
import { formatCurrency } from "@/lib/format";
import { AppHeaderProperties } from "@/components/layout/AppHeaderPropertiesContext";
import { NotificationsProvider } from "@/components/layout/NotificationsContext";

// Every shell route reads per-org data from Neon behind auth (requireCtx) — inherently dynamic,
// never statically prerenderable. Matches the (pro) pages, which already opt out of static gen.
export const dynamic = "force-dynamic";

export default async function ShellGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authCtx = await requireCtx();
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
    <ShellLayout>
      <NotificationsProvider notifications={notifications}>
        <AppHeaderProperties properties={slim}>{children}</AppHeaderProperties>
      </NotificationsProvider>
    </ShellLayout>
  );
}
