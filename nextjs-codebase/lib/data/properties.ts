import { properties, type Property } from "@/lib/mock-data";

export type { Property } from "@/lib/mock-data";

export async function getProperties(): Promise<Property[]> {
  return structuredClone(properties);
}

export async function getPropertyByIdParam(id: string): Promise<Property | null> {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const found = properties.find((p) => p.id === n);
  return found ? structuredClone(found) : null;
}
