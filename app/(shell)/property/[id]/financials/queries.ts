import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { cachedListPropertyValuations } from "@/lib/data/cached-reads";
import type { Ctx } from "@/lib/services/_mapping";

export async function getFinancialsPageData(propertyId: string, overrideCtx?: Ctx) {
  const authCtx = overrideCtx ?? await requireCtx();
  const valuations = await cachedListPropertyValuations(authCtx, propertyId);
  return { valuations };
}