import { ShellLayout } from "@/components/layout/ShellLayout";
import * as propertiesDb from "@/lib/data/db/properties";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { PropertyListItem } from "@/lib/data/types/property";
import { formatCurrency } from "@/lib/format";
import { AppHeaderProperties } from "@/components/layout/AppHeaderPropertiesContext";

export default async function ShellGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const properties = await propertiesDb.list(getCurrentUserId());
  const slim: PropertyListItem[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    province: p.province,
    status: p.status,
    buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—",
    health: p.health,
    totalArea: p.totalArea,
    title: p.title,
  }));

  return (
    <ShellLayout>
      <AppHeaderProperties properties={slim}>{children}</AppHeaderProperties>
    </ShellLayout>
  );
}
