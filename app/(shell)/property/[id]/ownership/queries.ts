import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";

export async function getOwnershipPageData(propertyId: string) {
  const userId = getCurrentUserId();
  const [allRecords, allHistory] = await Promise.all([
    db.ownershipRecords.list(userId),
    db.ownershipHistory.list(userId),
  ]);
  return {
    ownershipRecords: allRecords.filter((x) => x.propertyId === propertyId),
    ownershipHistory: allHistory.filter((x) => x.propertyId === propertyId),
  };
}
