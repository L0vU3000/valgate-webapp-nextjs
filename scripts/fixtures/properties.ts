import type { NewProperty } from "@/lib/data/db/properties";
import { properties as mockProperties } from "@/lib/mock-data";
import type { PropertyTitle, TitleVariant } from "@/lib/data/types/property";

export const properties: NewProperty[] = mockProperties.map((p) => ({
  name: p.name,
  code: p.code,
  type: p.type,
  status: p.status,
  statusVariant: p.statusVariant,
  health: p.health,
  lat: p.lat,
  lng: p.lng,
  province: p.province,
  size: p.size,
  buy: p.buy,
  buyNumeric: p.buyNumeric,
  title: p.title as PropertyTitle,
  titleVariant: p.titleVariant as TitleVariant,
}));
