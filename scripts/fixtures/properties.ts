import type { NewProperty } from "@/lib/data/db/properties";
import { properties as mockProperties } from "@/lib/mock-data";
import type { PropertyTitle } from "@/lib/data/types/property";

export const properties: NewProperty[] = mockProperties.map((p) => ({
  name: p.name,
  code: p.code,
  type: p.type,
  status: p.status,
  health: p.health,
  lat: p.lat,
  lng: p.lng,
  province: p.province,
  totalArea: p.totalArea,
  buyNumeric: p.buyNumeric,
  title: p.title as PropertyTitle,
}));
