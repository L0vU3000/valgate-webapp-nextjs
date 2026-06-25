import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listProperties, getProperty } from "@/lib/services/properties";

export type {
  Property,
  TitleVariant,
  PropertyListItem,
} from "@/lib/data/types/property";
import type { Property } from "@/lib/data/types/property";

export async function getProperties(): Promise<Property[]> {
  const ctx = await requireCtx();
  return listProperties(ctx);
}

export async function getPropertyByIdParam(
  id: string,
): Promise<Property | null> {
  const ctx = await requireCtx();
  return getProperty(ctx, id);
}
