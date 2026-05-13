import { ShellLayout } from "@/components/layout/ShellLayout";
import * as propertiesDb from "@/lib/data/db/properties";
import * as notificationsDb from "@/lib/data/db/notifications";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { PropertyListItem } from "@/lib/data/types/property";
import { formatCurrency } from "@/lib/format";
import { AppHeaderProperties } from "@/components/layout/AppHeaderPropertiesContext";
import { NotificationsProvider } from "@/components/layout/NotificationsContext";

export default async function ShellGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = getCurrentUserId();
  const [properties, notifications] = await Promise.all([
    propertiesDb.list(userId),
    notificationsDb.list(userId),
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
    progress: p.health ?? 0,
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
