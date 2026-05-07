import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";

export type OwnershipPageData = {
  ownershipDocuments: Awaited<ReturnType<typeof db.ownershipDocuments.list>>;
  ownershipHistory: Awaited<ReturnType<typeof db.ownershipHistory.list>>;
  coOwners: Awaited<ReturnType<typeof db.coOwners.list>>;
  ownershipRecord: OwnershipRecord | null;
  monthlyRentIncome: number;
};

export async function getOwnershipPageData(propertyId: string): Promise<OwnershipPageData> {
  const userId = getCurrentUserId();
  const [allDocuments, allHistory, allCoOwners, allLeases, allOwnershipRecords] = await Promise.all([
    db.ownershipDocuments.list(userId),
    db.ownershipHistory.list(userId),
    db.coOwners.list(userId),
    db.leases.list(userId),
    db.ownershipRecords.list(userId),
  ]);

  const signedLeases = allLeases.filter(
    (l) => l.propertyId === propertyId && l.stage === "Signed",
  );
  const monthlyRentIncome = signedLeases.reduce((s, l) => s + l.monthlyRent, 0);

  const propertyOwnershipRecords = allOwnershipRecords.filter((x) => x.propertyId === propertyId);
  const ownershipRecord = propertyOwnershipRecords[0] ?? null;

  return {
    ownershipDocuments: allDocuments.filter((x) => x.propertyId === propertyId),
    ownershipHistory: allHistory.filter((x) => x.propertyId === propertyId),
    coOwners: allCoOwners.filter((x) => x.propertyId === propertyId),
    ownershipRecord,
    monthlyRentIncome,
  };
}
