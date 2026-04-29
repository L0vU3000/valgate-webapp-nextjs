import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";

export async function getValuationPageData(propertyId: string) {
  const userId = getCurrentUserId();
  const all = await db.propertyValuations.list(userId);
  return {
    valuations: all.filter((x) => x.propertyId === propertyId),
  };
}
