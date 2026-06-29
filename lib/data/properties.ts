import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { requireCtx } from "@/lib/auth/ctx";
import { listProperties, getProperty } from "@/lib/services/properties";

export type {
  Property,
  TitleVariant,
  PropertyListItem,
} from "@/lib/data/types/property";
import type { Property } from "@/lib/data/types/property";

async function resolveProperties(): Promise<Property[]> {
  const ctx = await requireCtx();
  return unstable_cache(
    async () => listProperties(ctx),
    ["properties", ctx.orgId],
    { tags: ["properties"] },
  )();
}

export const getProperties = cache(resolveProperties);

async function resolvePropertyById(id: string): Promise<Property | null> {
  const ctx = await requireCtx();
  return unstable_cache(
    async () => getProperty(ctx, id),
    ["properties", ctx.orgId, id],
    { tags: ["properties"] },
  )();
}

export const getPropertyByIdParam = cache(resolvePropertyById);
