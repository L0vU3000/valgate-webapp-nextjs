import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listPropertyValuations } from "@/lib/services/property-valuations";

export async function getFinancialsPageData(propertyId: string) {
  const authCtx = await requireCtx();
  const all = await listPropertyValuations(authCtx);
  return {
    valuations: all.filter((x) => x.propertyId === propertyId),
  };
}
