import "server-only";
import * as propertiesDb from "@/lib/data/db/properties";
import { getCurrentUserId } from "@/lib/data/auth-shim";

export type {
  Property,
  TitleVariant,
  PropertyListItem,
} from "@/lib/data/types/property";
import type { Property } from "@/lib/data/types/property";

export async function getProperties(): Promise<Property[]> {
  return propertiesDb.list(getCurrentUserId());
}

export async function getPropertyByIdParam(
  id: string,
): Promise<Property | null> {
  return propertiesDb.get(getCurrentUserId(), id);
}
