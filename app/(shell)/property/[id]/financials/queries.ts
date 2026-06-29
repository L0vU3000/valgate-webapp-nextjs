import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { cachedListPropertyValuations } from "@/lib/data/cached-reads";

// cachedListPropertyValuations passes propertyId so only this property's valuations come back
// from the DB. No JS filter needed.
export async function getFinancialsPageData(propertyId: string) {
  const authCtx = await requireCtx();
  const valuations = await cachedListPropertyValuations(authCtx, propertyId);
  return { valuations };
}
